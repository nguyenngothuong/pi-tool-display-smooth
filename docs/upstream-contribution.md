# Upstream contribution draft

Target: zhcsyncer/pi-extensions, packages/pi-tool-display-intent.

Suggested title: Cache static assistant renders when hiding thinking blocks

When aggregate mode hides thinking, each history redraw strips thinking via
updateContent, renders, then restores the original message. Both updates
rebuild native Markdown children, defeating Pi's render caching.

The fork introduces a WeakMap cache for rendered static lines, keyed by message,
renderer, width, container and child identities. Streaming bypasses caching;
invalidations rebuild the children and miss the cache. The original message is
restored even on a rendering exception, and returned arrays are copied.

Transfer src/stripped-render-cache.ts and the small delegation change in
src/aggregate-thinking-placeholder.ts into the upstream package. Adapt the
eight regression tests in tests/ to upstream's test runner.

Validated with Pi 0.85.1: eight tests, synthetic offline PTY install/click/resize
checks, and local first-byte scroll latency comparisons documented in README.
No upstream PR has been submitted from this repository yet. Recheck upstream
HEAD before applying; this fork starts from the npm v0.10.0 distribution.
