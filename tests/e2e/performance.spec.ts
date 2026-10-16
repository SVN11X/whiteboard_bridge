import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
test('mediciones reproducibles con 100, 1000 y 10000 objetos', async ({ page, browserName }) => {
  test.setTimeout(120_000);
  const results = [];
  for (const count of [100, 1000, 10000]) {
    await page.goto('./'); await expect(page.getByTestId('board-canvas')).toBeVisible();
    const raw = JSON.stringify({ schema: 'whiteboard-bridge', version: 2, id: `benchmark-${count}`, name: `Benchmark ${count}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), viewport: { x: 0, y: 0, zoom: 1 }, objects: Array.from({ length: count }, (_, i) => ({ id: `shape-${i}`, type: 'shape', shape: 'rect', text: '', fontSize: 20, textColor: '#203a35', align: 'center', x: (i % 100) * 240, y: Math.floor(i / 100) * 180, width: 200, height: 130, rotation: 0, zIndex: i, opacity: 1, locked: false, groupId: null, fill: '#dceae6', stroke: '#24574e', strokeWidth: 2, label: '' })) });
    const start = Date.now(); await page.getByLabel('Archivo de proyecto').setInputFiles({ name: `benchmark-${count}.json`, mimeType: 'application/json', buffer: Buffer.from(raw) }); await expect(page.getByTestId('board-canvas')).toHaveAttribute('data-object-count', String(count)); const importMs = Date.now() - start;
    const canvasBox = await page.getByTestId('board-canvas').boundingBox();
    await page.mouse.move(canvasBox!.x + 400, canvasBox!.y + 250); await page.mouse.down({ button: 'middle' });
    const metrics = await page.evaluate(async () => {
      const canvas = document.querySelector('svg.board-canvas')!, rect = canvas.getBoundingClientRect(); let last = performance.now(); const intervals: number[] = [];
      // Actual pointer pan of the mounted production editor over 120 rendered frames.
      for (let i = 0; i < 120; i++) { await new Promise<void>(r => requestAnimationFrame(() => { const now = performance.now(); intervals.push(now - last); last = now; canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, pointerType: 'mouse', clientX: rect.left + 400 - i * 5, clientY: rect.top + 250 - i * 2 })); r(); })); }
      const sorted = intervals.slice(5).sort((a, b) => a - b);
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      return { fps: 1000 / (sorted.reduce((a, b) => a + b, 0) / sorted.length), frameP95Ms: sorted[Math.floor(sorted.length * .95)], heapMiB: memory ? memory.usedJSHeapSize / 1024 / 1024 : null, renderedObjects: document.querySelectorAll('[data-object]').length };
    });
    await page.mouse.up({ button: 'middle' });
    const t = Date.now(); await page.getByRole('button', { name: 'Acercar', exact: true }).click(); await expect(page.getByRole('button', { name: '120 %', exact: true })).toBeVisible(); const interactionMs = Date.now() - t;
    const session = await page.context().newCDPSession(page); const heap = await session.send('Runtime.getHeapUsage'); await session.detach();
    results.push({ count, importMs, interactionMs, ...metrics, cdpHeapUsedMiB: heap.usedSize / 1024 / 1024 }); expect(metrics.renderedObjects).toBeLessThan(150);
  }
  mkdirSync('test-results', { recursive: true }); writeFileSync('test-results/benchmark.json', JSON.stringify({ date: new Date().toISOString(), browser: browserName, userAgent: await page.evaluate(() => navigator.userAgent), note: 'Headless Linux, frames during viewport pan; heap is approximate and includes previous runs. Not a hardware guarantee.', viewport: page.viewportSize(), results }, null, 2));
});
