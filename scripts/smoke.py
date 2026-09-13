"""Kiểm tra cài package và click TUI bằng session giả, không gọi model (Unix)."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import pty
import re
import select
import signal
import struct
import subprocess
import tempfile
import termios
import time

parser = argparse.ArgumentParser()
parser.add_argument('package', help='Đường dẫn package hoặc git:github.com/owner/repo@tag')
args = parser.parse_args()
with tempfile.TemporaryDirectory(prefix='pi-smooth-smoke-') as directory:
    root = Path(directory)
    agent = root / 'agent'
    agent.mkdir()
    env = {**os.environ, 'PI_CODING_AGENT_DIR': str(agent), 'TERM': 'xterm-256color'}
    (agent / 'settings.json').write_text(json.dumps({
        'hideThinkingBlock': True, 'tuiMode': 'fullscreen', 'quietStartup': True,
        'fullscreenScrollbar': 'hidden',
    }))
    config = agent / 'extension-data/pi-tool-display-intent/config.json'
    config.parent.mkdir(parents=True)
    config.write_text(json.dumps({'version': 2, 'toolCalls': {'layout': 'aggregate'},
                                 'results': {'mode': 'summary'}, 'intent': {'language': 'auto'}}))
    subprocess.run(['pi', 'install', args.package], cwd=root, env=env, check=True, timeout=180)
    now = int(time.time() * 1000)
    usage = dict(input=10, output=10, cacheRead=0, cacheWrite=0, totalTokens=20,
                 cost=dict(input=0, output=0, cacheRead=0, cacheWrite=0, total=0))
    messages = [
        dict(role='user', content=[dict(type='text', text='Inspect example.txt')]),
        dict(role='assistant', content=[dict(type='thinking', thinking='HIDDEN_TEST_MARKER'),
             dict(type='toolCall', id='example-read', name='read', arguments={'path': 'example.txt'})],
             api='openai-completions', provider='example', model='example', usage=usage, stopReason='toolUse'),
        dict(role='toolResult', toolCallId='example-read', toolName='read',
             content=[dict(type='text', text='SYNTHETIC_RESULT_MARKER')], isError=False),
    ]
    entries = [dict(type='session', version=3, id='f7ca7ef3-65f3-4d2d-9540-14ce1b527388',
                    timestamp='2026-09-13T00:00:00Z', cwd=str(root))]
    for index, message in enumerate(messages):
        message['timestamp'] = now + index
        entries.append(dict(type='message', id=f'{index+1:08d}',
                            parentId=f'{index:08d}' if index else None,
                            timestamp='2026-09-13T00:00:00Z', message=message))
    session = root / 'session.jsonl'
    session.write_text('\n'.join(json.dumps(entry) for entry in entries) + '\n')
    master, slave = pty.openpty()
    fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 40, 120, 0, 0))
    process = subprocess.Popen(['pi', '--offline', '--no-skills', '--no-prompt-templates',
                                '--session', str(session)], cwd=root, env=env,
                               stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
    os.close(slave)

    def drain(timeout=5, quiet=0.3):
        output = b''
        start = last = time.monotonic()
        while time.monotonic() - start < timeout:
            if select.select([master], [], [], 0.02)[0]:
                chunk = os.read(master, 65536)
                if not chunk:
                    break
                output += chunk
                last = time.monotonic()
            elif output and time.monotonic() - last > quiet:
                break
        return output.decode('utf-8', errors='replace')

    def row_of(output, marker):
        for row, line in re.findall(r'\x1b\[(\d+);1H(.*?)(?=\x1b\[\d+;1H|$)', output, re.S):
            if marker in line:
                return int(row)
        raise AssertionError(f'Missing row: {marker}')

    def click(row):
        os.write(master, f'\x1b[<0;8;{row}M\x1b[<0;8;{row}m'.encode())
        return drain()

    try:
        initial = drain(30, 2)
        assert 'Failed to load' not in initial and 'HIDDEN_TEST_MARKER' not in initial
        run_row = row_of(initial, 'Run')
        expanded = click(run_row)
        detail = click(row_of(expanded, 'Read('))
        assert 'SYNTHETIC_RESULT_MARKER' in detail and '[Result]' in detail
        os.write(master, b'\t')
        assert '[Args]' in drain()
        os.write(master, b'\x1b')
        drain()
        collapsed = click(run_row)
        assert 'Read(' not in collapsed
        fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack('HHHH', 32, 90, 0, 0))
        os.kill(process.pid, signal.SIGWINCH)
        assert drain(), 'No response to resize'
        print('PASS: isolated install, hidden thinking, expand, Result, Args, collapse, resize')
    finally:
        process.terminate()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        os.close(master)
