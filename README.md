# Pi Tool Display Smooth

Compact tool groups, click-to-inspect results, and smoother history scrolling in Pi.

**Independent community fork** of [pi-tool-display-intent](https://github.com/zhcsyncer/pi-extensions/tree/main/packages/pi-tool-display-intent) v0.10.0. The display features are upstream's work; this fork adds a focused cache to avoid rebuilding static Markdown while scrolling with thinking hidden. [Tiếng Việt](README.vi.md) · [Attribution](NOTICE.md)

## Install

Tested with **Pi 0.85.1 and Node.js 22**. Other Pi versions are not yet validated: this extension patches internal UI components.

```sh
pi install git:github.com/nguyenngothuong/pi-tool-display-smooth@v0.1.0
```

If you already use `pi-tool-display-intent`, remove or disable that package first. Do not load both renderers together. For the pinned upstream package:

```sh
pi remove npm:@zhcsyncer/pi-tool-display-intent@0.10.0
```

Restart Pi after changing packages. This package does not change your provider, model, or thinking level.

For the compact fullscreen setup, merge these keys into your existing `~/.pi/agent/settings.json` (do not replace the whole file):

```json
{
  "hideThinkingBlock": true,
  "tuiMode": "fullscreen",
  "fullscreenScrollbar": "hidden"
}
```

Merge this configuration into `~/.pi/agent/extension-data/pi-tool-display-intent/config.json`. The upstream config directory is intentionally retained for compatibility:

```json
{
  "version": 2,
  "toolCalls": { "layout": "aggregate" },
  "results": { "mode": "summary" },
  "intent": { "language": "auto" }
}
```

## Inspect a tool when you need it

```text
✓ Run (1 call · 1 turn) · read ×1    ← click to expand / collapse
  └ ✓ Read(example.txt)              ← click to inspect

┌ Read(example.txt) ─────────────────────┐
│ [Result]  Args                         │
│ Example output                         │
│ Tab: switch view · Esc: close           │
└────────────────────────────────────────┘
```

Illustration only; appearance depends on terminal and theme. Mouse interactions were checked in fullscreen mode using terminal mouse events. Hiding thinking affects presentation; thinking and tool execution still run normally.

## What changed

When hiding thinking, upstream temporarily rebuilds an assistant message without thinking blocks, renders it, and rebuilds the original. On each scroll redraw this discards Pi's Markdown components and their caches.

This fork caches rendered lines for static messages in a WeakMap. Cache misses occur when the message, renderer, width, content container, or child components change. Streaming messages bypass the cache. Original messages are restored, and returned arrays are copied to avoid accidental cache mutation.

The runtime change is limited to `src/aggregate-thinking-placeholder.ts` and `src/stripped-render-cache.ts`.

## Evidence and limits

Local macOS PTY comparison, Pi 0.85.1, terminal 120×40, same offline copy of a 4.2 MB session, 24 scroll events per case:

| Run | Upstream | Fork | Fork repeat |
|---|---:|---:|---:|
| 1 | 36.5 ms | 11.2 ms | 11.4 ms |
| 2 | 32.5 ms | 9.5 ms | 10.9 ms |

These are median times to the **first output byte**, not FPS or complete screen rendering. Run 2 reduced that latency by 67–71%; this is a local observation, not a universal performance guarantee. Output byte totals matched within each comparison. The private session and raw traces are not included.

Eight regression tests cover static caching, resizing, content updates, invalidation, streaming, output mutation, error restoration, and Pi's real AssistantMessageComponent. Interactive PTY checks covered expand/collapse, Result/Args, and resize. Long-running memory use has not been benchmarked; each live component retains at most one cached line array. Native in-place changes must invalidate/rebuild child components, as Pi 0.85.1 does.

## Develop

```sh
npm ci --ignore-scripts
npm run check
```

`typecheck` checks the new cache module. It does not claim that the full upstream source passes strict TypeScript checks; pre-existing upstream errors remain outside this patch. Tests use synthetic data and do not call a model API.

On macOS/Linux with `pi` on PATH, test isolated installation and mouse interactions:

```sh
python3 scripts/smoke.py "$PWD"
```

The smoke check creates and removes a temporary Pi configuration and synthetic session. It does not modify your normal Pi settings.

## Remove / return to upstream

```sh
pi remove git:github.com/nguyenngothuong/pi-tool-display-smooth@v0.1.0
pi install npm:@zhcsyncer/pi-tool-display-intent@0.10.0
```

Restart Pi. Existing tool-display configuration remains compatible. This fork is pinned; upstream npm updates do not update it automatically.

MIT licensed. See [LICENSE](LICENSE), [UPSTREAM_LICENSE](UPSTREAM_LICENSE), and [NOTICE.md](NOTICE.md). No npm release is published for this fork.
