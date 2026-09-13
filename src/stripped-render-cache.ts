export interface StrippableComponent {
 lastMessage?: unknown;
 isStreaming?: boolean;
 contentContainer?: { children: unknown[] };
 updateContent?(message: unknown): void;
}


type CachedRender = {
 message: unknown;
 renderer: unknown;
 strip: (message: unknown) => unknown;
 width: number;
 container: object;
 children: unknown[];
 lines: string[];
};
const cache = new WeakMap<StrippableComponent, CachedRender>();

export function renderStrippedContent<T extends StrippableComponent>(
 component: T,
 render: (this: T, width: number) => string[],
 width: number,
 strip: (message: unknown) => unknown,
): string[] {
 const message = component.lastMessage;
 const container = component.contentContainer;
 const previous = cache.get(component);
 // Pi thay các component con khi nội dung/theme bị invalidate. Không cache streaming.
 if (!component.isStreaming && container && previous && previous.message === message
  && previous.renderer === render && previous.strip === strip && previous.width === width
  && previous.container === container && previous.children.length === container.children.length
  && previous.children.every((child, index) => child === container.children[index])) {
  return previous.lines.slice();
 }
 cache.delete(component);
 const stripped = strip(message);
 if (stripped === message || !component.updateContent) return render.call(component, width);
 let lines: string[];
 let restored = false;
 try {
  component.updateContent(stripped);
  lines = render.call(component, width);
 } finally {
  try { component.updateContent(message); restored = true; }
  catch { /* Giữ cách khôi phục an toàn của upstream; không cache khi khôi phục lỗi. */ }
 }
 const currentContainer = component.contentContainer;
 if (restored && !component.isStreaming && currentContainer) {
  cache.set(component, { message, renderer: render, strip, width,
   container: currentContainer, children: currentContainer.children.slice(), lines: lines.slice() });
 }
 return lines;
}
