import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AssistantMessageComponent, initTheme } from '@earendil-works/pi-coding-agent';
import { renderStrippedContent } from '../src/stripped-render-cache.ts';

initTheme('dark');

const strip = (m: any) => ({...m, content: m.content.filter((c: any) => c.type !== 'thinking')});
const message = (text: string) => ({role:'assistant',content:[{type:'thinking',thinking:'HIDDEN_THINKING_TEST'},{type:'text',text}], stopReason:'stop', timestamp:1});
test('cache dùng được với component Pi thật, khôi phục message và làm mới sau resize/stream', () => {
 const original = message('Alpha **bold** text with enough words to wrap on a narrow terminal.');
 const c = new AssistantMessageComponent(original as any, true) as any;
 const render = AssistantMessageComponent.prototype.render;
 const a = renderStrippedContent(c,render,80,strip);
 const children = c.contentContainer.children.slice();
 const b = renderStrippedContent(c,render,80,strip);
 assert.deepEqual(a,b); assert.equal(c.lastMessage,original);
 assert.ok(c.contentContainer.children.every((child: unknown,i:number)=>child===children[i]));
 assert.ok(!a.join('').includes('HIDDEN_THINKING_TEST'));
 const narrow = renderStrippedContent(c,render,20,strip);
 assert.ok(narrow.length > a.length);
 c.updateContent(message('New streamed content'),true);
 assert.ok(renderStrippedContent(c,render,80,strip).join('').includes('New streamed content'));
 c.updateContent(message('Final response'),false);
 assert.ok(renderStrippedContent(c,render,80,strip).join('').includes('Final response'));
 c.invalidate();
 assert.ok(renderStrippedContent(c,render,80,strip).join('').includes('Final response'));
});
