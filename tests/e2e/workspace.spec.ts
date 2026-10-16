import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { whiteboardPayload } from '../../src/clipboard/whiteboard';
import { openLab, openSettings } from './workspace-helpers';

test.beforeEach(async ({ page }) => { await page.goto('./'); await expect(page.locator('.loading-cover')).toHaveCount(0); });
async function note(page: Page, text = 'Primera idea') {
  await page.getByRole('button', { name: 'Nota adhesiva', exact: true }).click();
  await page.getByRole('button', { name: 'Nota amarilla', exact: true }).click();
  await page.getByTestId('board-canvas').click({ position: { x: 310, y: 180 } });
  await page.getByLabel('Editar texto en lienzo').fill(text);
  await page.getByLabel('Editar texto en lienzo').press('Control+Enter');
}

test('el lienzo comienza vacío y una nota se edita con un clic, deshace por sesión y persiste', async ({ page }) => {
  await expect(page.getByTestId('object-count')).toContainText('0 objetos');
  await expect(page.getByRole('complementary', { name: 'Propiedades y capas' })).toHaveCount(0);
  await note(page);
  const original = page.locator('[data-object][aria-label="Primera idea"]'); await original.click({ position: { x: 30, y: 30 } });
  await expect(page.getByLabel('Editar texto en lienzo')).toBeFocused();
  await page.getByLabel('Editar texto en lienzo').fill('Escribo sobre la nota\nsin el panel derecho.');
  await page.getByTestId('board-canvas').click({ position: { x: 800, y: 400 } });
  await expect(page.getByLabel('Editar texto en lienzo')).toHaveCount(0);
  await page.keyboard.press('Control+z'); await expect(original).toHaveCount(1);
  await page.keyboard.press('Control+Shift+z'); await expect(page.locator('[data-object]')).toHaveAttribute('aria-label', 'Escribo sobre la nota\nsin el panel derecho.');
  await expect(page.getByText('Guardado local', { exact: true })).toBeVisible(); await page.reload();
  await expect(page.locator('[data-object]')).toHaveAttribute('aria-label', 'Escribo sobre la nota\nsin el panel derecho.');
});

test('arrastrar mueve la nota sin abrir escritura y Enter y Escape permiten editar por teclado', async ({ page }) => {
  await note(page); const item = page.locator('[data-object]'); const box = (await item.boundingBox())!;
  await page.mouse.move(box.x + 60, box.y + 60); await page.mouse.down(); await page.mouse.move(box.x + 150, box.y + 130, { steps: 10 }); await page.mouse.up();
  const moved = (await item.boundingBox())!; expect(moved.x - box.x).toBeCloseTo(90, 0); expect(moved.y - box.y).toBeCloseTo(70, 0);
  await expect(page.getByLabel('Editar texto en lienzo')).toHaveCount(0);
  await page.getByTestId('board-canvas').press('Enter'); await page.getByLabel('Editar texto en lienzo').fill('Cambio cancelado'); await page.getByLabel('Editar texto en lienzo').press('Escape');
  await expect(item).toHaveAttribute('aria-label', 'Primera idea');
  await page.getByTestId('board-canvas').press('F2'); await expect(page.getByLabel('Editar texto en lienzo')).toHaveValue('Primera idea');
});

test('fondo y cuadrícula cambian, se conservan al recargar y se incluyen en WBRIDGE', async ({ page }, testInfo) => {
  await openSettings(page); await page.getByRole('button', { name: 'Formato del fondo', exact: true }).click();
  await page.getByRole('button', { name: 'Fondo #e8d6f1', exact: true }).click(); await page.getByRole('button', { name: 'Cuadrícula Gráfico', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar formato del fondo', exact: true }).click();
  await expect(page.getByTestId('board-canvas').locator('rect').first()).toHaveAttribute('fill', '#e8d6f1');
  await expect(page.getByText('Guardado local', { exact: true })).toBeVisible(); await page.reload();
  await expect(page.getByTestId('board-canvas').locator('rect').first()).toHaveAttribute('fill', '#e8d6f1');
  const event = page.waitForEvent('download'); await page.getByTestId('board-canvas').press('Control+s'); const download = await event; const file = testInfo.outputPath('background.wbridge'); await download.saveAs(file);
  expect(JSON.parse(await readFile(file, 'utf8')).background).toEqual({ color: '#e8d6f1', grid: 'graph' });
});

test('herramientas, paletas, zoom y configuración quedan dentro de la pantalla a 360, 820 y 1440 px', async ({ page }, testInfo) => {
  await page.getByLabel('Archivo de proyecto').setInputFiles({ name: 'layout.wbridge', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"objects":[]}') });
  await expect(page.getByRole('status')).toContainText('Proyecto importado');
  for (const width of [360, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const settings = (await page.getByRole('button', { name: 'Configuración', exact: true }).boundingBox())!; expect(settings.x).toBeGreaterThanOrEqual(0); expect(settings.x + settings.width).toBeLessThanOrEqual(width);
    const dock = (await page.locator('.floating-tools').boundingBox())!; expect(dock.x).toBeGreaterThanOrEqual(0); expect(dock.x + dock.width).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Nota adhesiva', exact: true }).click();
    const palette = (await page.locator('.tool-popover').boundingBox())!; expect(palette.x).toBeGreaterThanOrEqual(0); expect(palette.x + palette.width).toBeLessThanOrEqual(width);
    await expect(page.getByRole('button', { name: 'Nota morada', exact: true })).toBeVisible();
    const toast = (await page.locator('.status-toast').boundingBox())!; expect(toast.x + toast.width <= palette.x || palette.x + palette.width <= toast.x || toast.y + toast.height <= palette.y || palette.y + palette.height <= toast.y).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`workspace-${width}.png`) });
    await page.getByRole('button', { name: 'Cerrar herramientas', exact: true }).click();
  }
});

test('el portapapeles de Chromium conserva el contenedor Microsoft sintético, sin aplanar a PNG', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']); await note(page, 'Prueba nativa\nTexto editable');
  await page.getByRole('button', { name: 'Copiar objetos seleccionados', exact: true }).click(); await expect(page.getByRole('status')).toContainText('experimental');
  const html = await page.evaluate(async () => { const entries = await navigator.clipboard.read(); const item = entries.find(item => item.types.includes('text/html'))!; return (await item.getType('text/html')).text(); });
  expect(whiteboardPayload(html)).toMatchObject({ boardItems: [{ content: { contentType: 'note', text: 'Prueba nativa\nTexto editable' } }] });
  await page.evaluate(async html => navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })]), html);
  await page.getByTestId('board-canvas').press('Control+v'); await expect(page.getByTestId('object-count')).toContainText('2 objetos');
  await page.locator('[data-object]').last().click({ position: { x: 30, y: 30 } }); await expect(page.getByLabel('Editar texto en lienzo')).toHaveValue('Prueba nativa\nTexto editable');
});

test('una selección incompatible deja intacto el portapapeles y muestra el límite del adaptador', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Figuras', exact: true }).click(); await page.getByRole('button', { name: 'Línea', exact: true }).click(); await page.getByTestId('board-canvas').click({ position: { x: 300, y: 200 } });
  await page.evaluate(() => navigator.clipboard.writeText('Portapapeles conservado'));
  await page.getByRole('button', { name: 'Copiar objetos seleccionados', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('No se ha sustituido por una imagen'); expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Portapapeles conservado');
});

test('captura el HTML nativo de una muestra sintética y descarga JSON sin insertar HTML en la página', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']); await note(page, 'Muestra sintética');
  await page.getByRole('button', { name: 'Copiar objetos seleccionados', exact: true }).click();
  await openLab(page); await page.getByRole('button', { name: 'Capturar muestra Whiteboard', exact: true }).click();
  await page.getByRole('textbox', { name: 'Pegar muestra de Whiteboard', exact: true }).press('Control+v'); await expect(page.getByText('Muestra capturada.', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Leer muestra del portapapeles', exact: true }).click(); await expect(page.getByText('Muestra capturada.', { exact: true })).toBeVisible();
  const event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Descargar muestra JSON', exact: true }).click(); const download = await event; const file = testInfo.outputPath('clipboard-sample.json'); await download.saveAs(file);
  const raw = JSON.parse(await readFile(file, 'utf8')); expect(raw.schema).toBe('whiteboard-clipboard-sample'); expect(raw.payload.boardItems[0].content.text).toBe('Muestra sintética'); await expect(page.locator('whiteboard-tag')).toHaveCount(0);
});

test('plantillas y enlaces crean contenido editable y el temporizador inicia, pausa y reinicia', async ({ page }) => {
  await page.getByRole('button', { name: 'Más herramientas', exact: true }).click(); await page.getByRole('button', { name: 'Plantillas', exact: true }).click(); await page.getByRole('button', { name: /Lluvia de ideas/ }).click(); await expect(page.getByTestId('object-count')).toContainText('7 objetos');
  await page.getByRole('button', { name: 'Más herramientas', exact: true }).click(); await page.getByRole('button', { name: 'Enlace o video', exact: true }).click(); await page.getByLabel('Dirección del enlace').fill('https://example.com/video'); await page.getByRole('button', { name: 'Insertar enlace', exact: true }).click(); await expect(page.getByRole('link', { name: 'Abrir enlace' })).toHaveAttribute('href', 'https://example.com/video');
  await page.getByRole('button', { name: 'Temporizador', exact: true }).click(); await page.getByLabel('Minutos', { exact: true }).fill('1'); await page.getByRole('button', { name: 'Iniciar', exact: true }).click(); await expect(page.locator('.timer-popover output')).toHaveText('00:59'); await page.getByRole('button', { name: 'Pausar', exact: true }).click(); await page.getByRole('button', { name: 'Reiniciar', exact: true }).click(); await expect(page.locator('.timer-popover output')).toHaveText('01:00');
});
