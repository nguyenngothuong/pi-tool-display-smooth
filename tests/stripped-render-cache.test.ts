import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderStrippedContent } from '../src/stripped-render-cache.ts';

function fixture() {
 const original = { text: 'reply', thinking: 'private' };
 let updates = 0;
 const component = {
  lastMessage: original, isStreaming: false, contentContainer: { children: [{}] },
  updateContent(message: typeof original) { updates++; this.lastMessage = message; this.contentContainer.children = [{}]; },
 };
 const strip = (m: typeof original) => ({ ...m, thinking: '' });
 const render = function(width: number) { return [this.lastMessage.text.slice(0, width)]; };
 const run = (width = 80) => renderStrippedContent(component, render, width, strip);
 return { component, original, render, strip, run, updates: () => updates };
}

test('cuộn lại nội dung tĩnh không dựng lại Markdown', () => {
 const f = fixture(); assert.deepEqual(f.run(), ['reply']); const first = f.updates();
 assert.deepEqual(f.run(), ['reply']); assert.equal(f.updates(), first);
 assert.equal(f.component.lastMessage, f.original);
});
test('đổi chiều rộng phải tính lại', () => { const f = fixture(); f.run(); assert.deepEqual(f.run(2), ['re']); assert.equal(f.updates(), 4); });
test('cập nhật cùng đối tượng tin nhắn vẫn làm mới nội dung', () => {
 const f = fixture(); f.run(); f.original.text = 'new'; f.component.updateContent(f.original);
 assert.deepEqual(f.run(), ['new']);
});
test('invalidate hoặc đổi theme dựng lại các con phải bỏ cache', () => {
 const f = fixture(); f.run(); f.component.contentContainer.children[0] = {}; f.run(); assert.equal(f.updates(), 4);
});
test('đang streaming không dùng cache', () => {
 const f = fixture(); f.component.isStreaming = true; f.run(); f.original.text = 'stream'; assert.deepEqual(f.run(), ['stream']); assert.equal(f.updates(), 4);
});
test('dòng trả về không chia sẻ mảng để tránh bị sửa cache', () => {
 const f = fixture(); f.run()[0] = 'changed'; assert.deepEqual(f.run(), ['reply']);
});
test('render lỗi phải khôi phục tin nhắn gốc', () => {
 const f = fixture(); assert.throws(() => renderStrippedContent(f.component, () => {throw Error('test');},80,f.strip)); assert.equal(f.component.lastMessage,f.original);
});
