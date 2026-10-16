import { test, expect, type Page, type TestInfo, type Locator } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createBoard, makeObject, type Board, type BoardObject } from '../../src/models/document';
import { openSettings, openProperties } from './workspace-helpers';
async function fixture(page: Page) {
  await page.goto('./'); await expect(page.locator('.loading-cover')).toHaveCount(0);
  const board = createBoard('Conexiones fijas'), from = makeObject('shape', { x: 200, y: 200 }, { label: 'Origen', text: 'Origen', width: 160, height: 100 }), to = makeObject('shape', { x: 650, y: 330 }, { label: 'Destino', text: 'Destino', width: 180, height: 120 });
  board.objects = [from, to, makeObject('line', { x: 0, y: 0 }, { fromId: from.id, toId: to.id, fromAnchor: 'right', toAnchor: 'left', stroke: '#242424' })];
  await page.getByLabel('Archivo de proyecto').setInputFiles({ name: 'fixed.wbridge', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(board)) }); await expect(page.getByRole('status')).toContainText('Proyecto importado'); return board;
}
async function project(page: Page, info: TestInfo, label: string): Promise<Board> {
  const event = page.waitForEvent('download'); await page.getByTestId('board-canvas').press('Control+s'); const file = info.outputPath(`${label}.wbridge`); await (await event).saveAs(file); return JSON.parse(await readFile(file, 'utf8'));
}
const line = (board: Board) => board.objects.find(o => o.type === 'line') as Extract<BoardObject, { type: 'line' }>;
async function pathPoint(path: Locator, fraction = .5) { return path.evaluate((element, fraction) => { const p = (element as SVGPathElement).getPointAtLength((element as SVGPathElement).getTotalLength() * fraction), matrix = (element as SVGGraphicsElement).getScreenCTM()!; return { x: p.x * matrix.a + p.y * matrix.c + matrix.e, y: p.x * matrix.b + p.y * matrix.d + matrix.f }; }, fraction); }
async function selectLine(page: Page) { const p = await pathPoint(page.locator('[data-line-path]').first()); await page.mouse.click(p.x, p.y); }
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) { await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 10 }); await page.mouse.up(); }
async function color(input: Locator, value: string) { await input.evaluate((element, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); }, value); }

test('paleta de figuras y barra de selección claras incluso con tema oscuro, a 360, 820 y 1440 px', async ({ page }, info) => {
  await fixture(page); await openSettings(page); await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click(); await page.getByRole('button', { name: 'Cerrar configuración', exact: true }).click();
  for (const width of [360, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.getByRole('button', { name: 'Figuras', exact: true }).click();
    const palette = page.getByRole('region', { name: 'Figuras y conectores' });
    await expect(palette).toHaveCSS('background-color', 'rgb(255, 255, 255)'); await expect(palette.locator('.shape-palette button')).toHaveCount(12);
    await expect(palette.getByRole('button', { name: 'Flecha', exact: true }).locator('svg')).toHaveCSS('stroke', 'rgb(17, 17, 17)');
    const rect = (await palette.boundingBox())!; expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.x + rect.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: info.outputPath(`palette-${width}.png`) }); await palette.getByRole('button', { name: 'Cerrar herramientas', exact: true }).click();
  }
  await selectLine(page); await expect(page.getByRole('toolbar', { name: 'Acciones de selección' })).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await openSettings(page); await page.locator('.bar-colors summary').click(); await color(page.getByLabel('Color de barra inferior', { exact: true }), '#dceaff'); await page.getByRole('button', { name: 'Cerrar configuración', exact: true }).click();
  await expect(page.getByRole('toolbar', { name: 'Acciones de selección' })).toHaveCSS('background-color', 'rgb(220, 234, 255)');
  await page.getByRole('button', { name: 'Figuras', exact: true }).click(); await expect(page.getByRole('region', { name: 'Figuras y conectores' })).toHaveCSS('background-color', 'rgb(220, 234, 255)');
});

test('los lados de unión se conservan y fijar en lienzo mantiene la flecha inmóvil al mover una figura', async ({ page }, info) => {
  const board = await fixture(page), pane = (await page.getByTestId('board-canvas').boundingBox())!;
  await drag(page, { x: pane.x + 240, y: pane.y + 240 }, { x: pane.x + 270, y: pane.y + 500 });
  const moved = line(await project(page, info, 'moved')); expect(moved.fromAnchor).toBe('right'); expect(moved.toAnchor).toBe('left'); expect(moved.routePoints.length).toBeGreaterThan(2);
  const from = (await project(page, info, 'moved-source')).objects.find(o => o.id === board.objects[0].id)!;
  expect(moved.x + moved.routePoints[0].x * moved.width).toBeCloseTo(from.x + from.width); expect(moved.y + moved.routePoints[0].y * moved.height).toBeCloseTo(from.y + from.height / 2);
  await selectLine(page); await page.getByRole('button', { name: 'Fijar conexión en el lienzo', exact: true }).click();
  const path = page.locator('[data-line-path]'), group = page.locator('[data-object-type="line"]'), pathBefore = await path.getAttribute('d'), transformBefore = await group.getAttribute('transform');
  await drag(page, { x: pane.x + 700, y: pane.y + 370 }, { x: pane.x + 760, y: pane.y + 440 });
  await expect(path).toHaveAttribute('d', pathBefore!); await expect(group).toHaveAttribute('transform', transformBefore!); expect(line(await project(page, info, 'fixed')).followsObjects).toBe(false);
  await expect(page.getByText('Guardado local', { exact: true })).toBeVisible(); await page.reload(); await expect(path).toHaveAttribute('d', pathBefore!); await expect(group).toHaveAttribute('transform', transformBefore!);
  const p = await pathPoint(path); await drag(page, p, { x: p.x + 40, y: p.y + 50 }); const translated = line(await project(page, info, 'manual')); expect(translated.x).toBeCloseTo(moved.x + 40); expect(translated.y).toBeCloseTo(moved.y + 50);
  await page.getByTestId('board-canvas').press('Control+z'); await expect(group).toHaveAttribute('transform', transformBefore!);
});

test('codo manual, reconexión a otro lado, deshacer y controles por teclado conservan las decisiones', async ({ page }, info) => {
  await fixture(page); const pane = (await page.getByTestId('board-canvas').boundingBox())!; await selectLine(page);
  const handle = (await page.locator('[data-bend-handle]').boundingBox())!;
  await drag(page, { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 }, { x: pane.x + 480, y: pane.y + 560 });
  expect(line(await project(page, info, 'bend')).bend).toEqual({ x: 480, y: 560 });
  const start = (await page.locator('[data-line-end="start"]').boundingBox())!;
  await drag(page, { x: start.x + start.width / 2, y: start.y + start.height / 2 }, { x: pane.x + 280, y: pane.y + 200 });
  expect(line(await project(page, info, 'top-port')).fromAnchor).toBe('top');
  await page.getByTestId('board-canvas').press('Control+z'); expect(line(await project(page, info, 'undo-port')).fromAnchor).toBe('right');
  await selectLine(page); await openProperties(page); await page.getByLabel('Unión de destino', { exact: true }).selectOption('bottom');
  expect(line(await project(page, info, 'bottom-port')).toAnchor).toBe('bottom');
  await page.getByLabel('Recorrido de conexión', { exact: true }).selectOption('straight'); expect(line(await project(page, info, 'straight')).routePoints).toHaveLength(2);
  await page.getByLabel('Unión de destino', { exact: true }).selectOption(''); const detached = line(await project(page, info, 'free-end')); expect(detached.toId).toBe(null); expect(detached.toAnchor).toBe(null);
});

test('12 plantillas filtrables, diagrama editable, encuadre completo y deshacer inserción', async ({ page }, info) => {
  await page.goto('./'); await expect(page.locator('.loading-cover')).toHaveCount(0);
  const open = async () => { await page.getByRole('button', { name: 'Más herramientas', exact: true }).click(); await page.getByRole('button', { name: 'Plantillas', exact: true }).click(); };
  await open(); const dialog = page.getByRole('dialog', { name: 'Plantillas', exact: true }); await expect(dialog.locator('[data-template]')).toHaveCount(12);
  await page.getByLabel('Categoría de plantillas', { exact: true }).selectOption('Diagramas'); await expect(dialog.locator('[data-template]')).toHaveCount(2);
  await page.getByLabel('Buscar plantilla', { exact: true }).fill('flujo'); await expect(dialog.locator('[data-template]')).toHaveCount(1); await dialog.locator('[data-template="flow"]').click();
  const canvas = (await page.getByTestId('board-canvas').boundingBox())!;
  for (const object of await page.locator('[data-object]').all()) { const b = (await object.boundingBox())!; expect(b.x).toBeGreaterThanOrEqual(canvas.x); expect(b.x + b.width).toBeLessThanOrEqual(canvas.x + canvas.width); expect(b.y).toBeGreaterThanOrEqual(canvas.y); expect(b.y + b.height).toBeLessThanOrEqual(canvas.y + canvas.height); }
  await page.locator('[data-object][aria-label="¿Aprobada?"]').click({ position: { x: 60, y: 50 } }); await page.getByLabel('Editar texto en lienzo').fill('Decisión editable'); await page.getByLabel('Editar texto en lienzo').press('Control+Enter');
  expect((await project(page, info, 'template')).objects.some(o => 'text' in o && o.text === 'Decisión editable')).toBe(true);
  await page.getByTestId('board-canvas').press('Control+z'); await page.getByTestId('board-canvas').press('Control+z'); await expect(page.getByTestId('board-canvas')).toHaveAttribute('data-object-count', '0');
  await page.setViewportSize({ width: 360, height: 800 }); await open(); await expect(dialog.locator('[data-template]')).toHaveCount(12); expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true); await page.screenshot({ path: info.outputPath('templates-360.png') });
});
