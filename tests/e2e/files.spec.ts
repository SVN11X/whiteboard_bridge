import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function saved(page: Page) { await expect(page.getByText('Guardado local', { exact: true })).toBeVisible(); }

test('exporta .wbridge y lo importa conservando grupos y texto editable sin reemplazar la pizarra anterior', async ({ page }, testInfo) => {
  await page.goto('./'); await page.getByRole('button', { name: 'Crear una nota', exact: true }).click();
  await page.getByLabel('Contenido del objeto').fill('Una idea que vuelve');
  await page.getByTestId('board-canvas').focus(); await page.keyboard.press('Control+a'); await page.keyboard.press('Control+g');
  await page.locator('.export-menu summary').click(); const event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Pizarra editable · WBRIDGE', exact: true }).click();
  const download = await event; expect(download.suggestedFilename()).toBe('el-proximo-gran-paso.wbridge'); const path = testInfo.outputPath('round-trip.wbridge'); await download.saveAs(path);
  const raw = JSON.parse(await readFile(path, 'utf8')); expect(raw.schema).toBe('whiteboard-bridge'); expect(raw.objects.filter((o: { type: string }) => o.type === 'group')).toHaveLength(1);
  await page.getByTestId('board-canvas').focus(); await page.keyboard.press('Delete'); await expect(page.getByTestId('object-count')).toContainText('0 objetos'); await saved(page);
  await page.getByLabel('Archivo de proyecto').setInputFiles(path); await expect(page.getByTestId('object-count')).toContainText('9 objetos');
  const note = page.locator('[data-object][aria-label="Una idea que vuelve"]'); await note.click({ modifiers: ['Alt'] }); await expect(page.getByLabel('Contenido del objeto')).toHaveValue('Una idea que vuelve');
  await page.getByLabel('Contenido del objeto').fill('Sigue siendo editable'); await saved(page); await page.reload(); await expect(page.locator('[data-object][aria-label="Sigue siendo editable"]')).toHaveCount(1);
  await page.getByRole('button', { name: /El próximo gran paso \(importada\)/ }).click(); await expect(page.locator('.project-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'El próximo gran paso', exact: true }).click(); await expect(page.getByTestId('object-count')).toContainText('0 objetos');
});

test('exporta solo una selección y Ctrl+S usa el formato editable principal', async ({ page }, testInfo) => {
  await page.goto('./'); await page.getByRole('button', { name: 'Crear una nota', exact: true }).click(); await page.getByLabel('Contenido del objeto').fill('Solo esta nota');
  await page.locator('.export-menu summary').click(); const event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Selección editable · WBRIDGE', exact: true }).click(); const dl = await event;
  expect(dl.suggestedFilename()).toBe('el-proximo-gran-paso-seleccion.wbridge'); const path = testInfo.outputPath('selection.wbridge'); await dl.saveAs(path);
  const raw = JSON.parse(await readFile(path, 'utf8')); expect(raw.objects).toHaveLength(1); expect(raw.objects[0]).toMatchObject({ type: 'sticky', text: 'Solo esta nota' });
  await page.getByLabel('Archivo de proyecto').setInputFiles(path); await expect(page.getByTestId('object-count')).toContainText('1 objetos');
  await page.getByTestId('board-canvas').focus(); const keyboardDownload = page.waitForEvent('download'); await page.keyboard.press('Control+s'); expect((await keyboardDownload).suggestedFilename()).toMatch(/\.wbridge$/);
});

test('el botón Importar acepta imágenes y los archivos incompatibles dejan intacta la pizarra', async ({ page }) => {
  await page.goto('./'); const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Importar archivo', exact: true }).click(); await (await chooser).setFiles('public/icons/bridge-192.png');
  await expect(page.getByTestId('object-count')).toContainText('9 objetos'); await expect(page.getByRole('heading', { name: 'Imagen', exact: true })).toBeVisible();
  await page.getByLabel('Archivo de proyecto').setInputFiles({ name: 'original.whiteboard', mimeType: 'application/octet-stream', buffer: Buffer.from('sin esquema comprobado') }); await expect(page.getByRole('alert')).toContainText('no tiene un importador validado'); await expect(page.getByTestId('object-count')).toContainText('9 objetos');
  await page.getByLabel('Archivo de proyecto').setInputFiles({ name: 'roto.wbridge', mimeType: 'application/octet-stream', buffer: Buffer.from('{"schema":"whiteboard-bridge","version":999}') }); await expect(page.getByRole('alert')).toContainText('Proyecto no válido'); await expect(page.getByTestId('object-count')).toContainText('9 objetos');
  await page.getByLabel('Archivo de proyecto').setInputFiles({ name: 'falso.png', mimeType: 'image/png', buffer: Buffer.from('<svg onload="alert(1)"/>') }); await expect(page.getByRole('alert')).toContainText('firma'); await expect(page.getByTestId('object-count')).toContainText('9 objetos');
});

test('arrastra un proyecto al lienzo y muestra la guía de formatos a 360 px', async ({ page }) => {
  await page.goto('./'); const transfer = await page.evaluateHandle(() => { const dt = new DataTransfer(); dt.items.add(new File(['{"version":1,"objects":[]}'], 'vacia.wbridge', { type: 'application/octet-stream' })); return dt; });
  await page.getByTestId('canvas-pane').dispatchEvent('drop', { dataTransfer: transfer }); await expect(page.getByTestId('object-count')).toContainText('0 objetos');
  await page.setViewportSize({ width: 360, height: 800 }); await expect(page.getByRole('button', { name: 'Importar archivo', exact: true })).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await page.locator('.export-menu summary').click(); await page.getByRole('button', { name: 'Formatos y ayuda', exact: true }).click(); await expect(page.getByRole('dialog', { name: 'Importar y exportar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Importar y exportar', exact: true })).toBeInViewport();
  await expect(page.getByRole('link', { name: /Descargar ejemplo/ })).toHaveAttribute('href', '/whiteboard_bridge/examples/primer-proyecto.wbridge'); expect(await page.getByRole('dialog').evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  const sample = await page.request.get('examples/primer-proyecto.wbridge'); expect(sample.ok()).toBe(true); expect((await sample.json()).schema).toBe('whiteboard-bridge');
});
