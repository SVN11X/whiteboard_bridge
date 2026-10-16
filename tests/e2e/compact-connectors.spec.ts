import { test, expect, type Page, type TestInfo, type Locator } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createBoard, makeObject, type Board, type BoardObject } from '../../src/models/document';
import { openSettings } from './workspace-helpers';

async function fixture(page: Page, zoom = 1) {
  await page.goto('./'); await expect(page.locator('.loading-cover')).toHaveCount(0);
  const board = createBoard('Conectar ideas'); board.viewport.zoom = zoom;
  board.objects = [
    makeObject('shape', { x: 180, y: 200 }, { width: 180, height: 120, label: 'Origen', text: 'Idea inicial', fill: '#b5ddf5' }),
    makeObject('shape', { x: 650, y: 210 }, { width: 180, height: 120, label: 'Destino', text: 'Siguiente paso', fill: '#b5ddf5' }),
    makeObject('shape', { x: 650, y: 460 }, { shape: 'ellipse', width: 180, height: 100, label: 'Otro destino', text: 'Resultado' }),
  ];
  await page.getByLabel('Archivo de proyecto').setInputFiles({ name: 'connectors.wbridge', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(board)) });
  await expect(page.getByRole('status')).toContainText('Proyecto importado'); return board;
}
async function project(page: Page, info: TestInfo, name: string): Promise<Board> {
  const event = page.waitForEvent('download'); await page.getByTestId('board-canvas').press('Control+s');
  const file = info.outputPath(`${name}.wbridge`); await (await event).saveAs(file); return JSON.parse(await readFile(file, 'utf8'));
}
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 12 }); await page.mouse.up();
}
async function color(input: Locator, value: string) {
  await input.evaluate((element, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, next);
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
function line(board: Board) { const value = board.objects.find(o => o.type === 'line'); expect(value).toBeTruthy(); return value as Extract<BoardObject, { type: 'line' }>; }

test('barras compactas blancas, colores independientes persistentes y contraste en tema oscuro', async ({ page }) => {
  await fixture(page);
  const header = page.locator('.whiteboard-header'), dock = page.locator('.tool-dock'), zoom = page.locator('.zoom-controls');
  expect((await header.boundingBox())!.height).toBe(40); expect((await dock.boundingBox())!.height).toBe(40); expect((await zoom.boundingBox())!.height).toBe(40);
  for (const bar of [header, dock, zoom]) await expect(bar).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.canvas-count,[data-testid="object-count"]')).toHaveCount(0);
  await openSettings(page); await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click();
  for (const bar of [header, dock, zoom]) await expect(bar).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.locator('.bar-colors summary').click();
  await color(page.getByLabel('Color de barra superior', { exact: true }), '#15324a');
  await color(page.getByLabel('Color de barra inferior', { exact: true }), '#ffe6a1');
  await expect(header).toHaveCSS('background-color', 'rgb(21, 50, 74)'); await expect(header).toHaveCSS('color', 'rgb(255, 255, 255)');
  for (const selector of ['.home-button', '.board-switch', '.share-button', '.settings-trigger']) await expect(header.locator(selector)).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(dock).toHaveCSS('background-color', 'rgb(255, 230, 161)'); await expect(zoom).toHaveCSS('background-color', 'rgb(255, 230, 161)');
  await expect(dock).toHaveCSS('color', 'rgb(17, 17, 17)');
  await page.reload(); await expect(page.locator('.loading-cover')).toHaveCount(0);
  await expect(header).toHaveCSS('background-color', 'rgb(21, 50, 74)'); await expect(dock).toHaveCSS('background-color', 'rgb(255, 230, 161)');
  await openSettings(page); await page.locator('.bar-colors summary').click(); await page.getByRole('button', { name: 'Restablecer barras blancas', exact: true }).click();
  for (const bar of [header, dock, zoom]) await expect(bar).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByTestId('board-canvas').locator('rect').first()).toHaveAttribute('fill', '#ffffff');
});

test('el zoom se detiene al 500% con botones, rueda y gesto de dos dedos; abre vistas antiguas', async ({ page, context }, info) => {
  await fixture(page, 8); await expect(page.getByRole('button', { name: '500 %', exact: true })).toBeVisible();
  expect((await project(page, info, 'legacy-view')).viewport.zoom).toBe(5);
  await page.getByRole('button', { name: '500 %', exact: true }).click();
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: 'Acercar', exact: true }).click();
  await expect(page.getByRole('button', { name: '500 %', exact: true })).toBeVisible(); await expect(page.getByRole('button', { name: 'Acercar', exact: true })).toBeDisabled();
  await page.getByTestId('board-canvas').hover(); await page.keyboard.down('Control'); await page.mouse.wheel(0, -3000); await page.keyboard.up('Control');
  await expect(page.getByRole('button', { name: '500 %', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '500 %', exact: true }).click();
  const session = await context.newCDPSession(page); await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 650, y: 400, id: 1 }, { x: 750, y: 400, id: 2 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 100, y: 400, id: 1 }, { x: 1300, y: 400, id: 2 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await session.detach();
  await expect(page.getByRole('button', { name: '500 %', exact: true })).toBeVisible();
});

test('conector visible al borde, sigue al mover figuras y permite volver a unir su extremo', async ({ page }, info) => {
  const board = await fixture(page), pane = (await page.getByTestId('board-canvas').boundingBox())!;
  await page.getByRole('button', { name: 'Figuras', exact: true }).click(); await page.getByRole('button', { name: 'Conector entre dos objetos', exact: true }).click();
  await page.locator('[data-object][aria-label="Origen"]').click({ position: { x: 40, y: 40 } });
  await page.locator('[data-object][aria-label="Destino"]').click({ position: { x: 40, y: 40 } });
  await expect(page.locator('[data-arrowhead="end"]')).toHaveAttribute('fill', '#242424');
  let value = line(await project(page, info, 'connected')); expect(value.fromId).toBe(board.objects[0].id); expect(value.toId).toBe(board.objects[1].id); expect(value.x).toBeCloseTo(360); expect(value.width).toBeCloseTo(290);
  await drag(page, { x: pane.x + 220, y: pane.y + 240 }, { x: pane.x + 280, y: pane.y + 280 });
  value = line(await project(page, info, 'moved')); expect(value.x).toBeCloseTo(420); expect(value.width).toBeCloseTo(230);
  await page.locator('[data-object-type="line"]').click();
  const end = (await page.locator('[data-line-end="end"]').boundingBox())!;
  await drag(page, { x: end.x + end.width / 2, y: end.y + end.height / 2 }, { x: pane.x + 740, y: pane.y + 510 });
  value = line(await project(page, info, 'reattached')); expect(value.fromId).toBe(board.objects[0].id); expect(value.toId).toBe(board.objects[2].id);
  await page.getByTestId('board-canvas').press('Control+z'); expect(line(await project(page, info, 'undo')).toId).toBe(board.objects[1].id);
});

test('arrastra puntos visibles o dibuja una flecha doble para unir figuras automáticamente', async ({ page }, info) => {
  const board = await fixture(page), pane = (await page.getByTestId('board-canvas').boundingBox())!;
  await page.locator('[data-object][aria-label="Origen"]').click({ position: { x: 40, y: 40 } }); await page.getByLabel('Editar texto en lienzo').press('Control+Enter');
  const handle = page.getByRole('button', { name: 'Conectar Origen desde derecha', exact: true }); await expect(handle).toBeVisible();
  const box = (await handle.boundingBox())!;
  await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, { x: pane.x + 740, y: pane.y + 270 });
  expect(line(await project(page, info, 'handle')).toId).toBe(board.objects[1].id);
  await page.getByRole('button', { name: 'Figuras', exact: true }).click(); await page.getByRole('button', { name: 'Flecha doble', exact: true }).click();
  await drag(page, { x: pane.x + 740, y: pane.y + 270 }, { x: pane.x + 740, y: pane.y + 510 });
  const saved = await project(page, info, 'double'); const value = saved.objects.filter(o => o.type === 'line').at(-1)!;
  expect(value).toMatchObject({ type: 'line', arrow: 'both', fromId: board.objects[1].id, toId: board.objects[2].id, width: 0 });
  await expect(page.locator(`[data-object="${value.id}"] [data-arrowhead]`)).toHaveCount(2);
  await color(page.getByLabel('Color de la selección', { exact: true }), '#e5484d');
  await expect(page.locator(`[data-object="${value.id}"] [data-arrowhead="end"]`)).toHaveAttribute('fill', '#e5484d');
});
