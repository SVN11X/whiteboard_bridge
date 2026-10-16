import { test, expect } from '@playwright/test';
const waitSaved = async (page: import('@playwright/test').Page) => { await expect(page.getByText('Guardado local', { exact: true })).toBeVisible(); };
test('crea, edita, deshace, exporta y conserva la pizarra al recargar', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); await page.goto('./');
  await expect(page.getByTestId('object-count')).toContainText('8 objetos');
  await page.getByRole('button', { name: 'Crear una nota', exact: true }).click();
  await expect(page.getByTestId('object-count')).toContainText('9 objetos');
  await page.getByLabel('Contenido del objeto').fill('Mi idea persistente'); await waitSaved(page);
  await page.getByRole('button', { name: 'Duplicar', exact: true }).click(); await expect(page.getByTestId('object-count')).toContainText('10 objetos');
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click(); await expect(page.getByTestId('object-count')).toContainText('9 objetos');
  await waitSaved(page); await page.reload(); await expect(page.locator('[data-object][aria-label="Mi idea persistente"]')).toHaveCount(1);
  await page.locator('.export-menu summary').click(); const event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Proyecto editable · JSON' }).click(); const dl = await event; expect(dl.suggestedFilename()).toBe('whiteboard-bridge-proyecto.json'); expect(errors).toEqual([]);
});
test('teclado, agrupación, propiedades, bloqueo y zoom', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: 'Crear una nota', exact: true }).click();
  await page.getByTestId('board-canvas').focus(); await page.keyboard.press('Control+a'); await page.keyboard.press('Control+g');
  await expect(page.getByRole('heading', { name: 'Grupo', exact: true })).toBeVisible();
  await page.getByLabel('x', { exact: true }).fill('300'); await page.getByLabel('x', { exact: true }).press('Enter'); await waitSaved(page);
  await page.getByRole('button', { name: 'Bloquear selección', exact: true }).click(); await expect(page.getByLabel('x', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Desbloquear selección', exact: true }).click(); await page.getByRole('button', { name: 'Desagrupar', exact: true }).click();
  await page.getByRole('button', { name: 'Acercar', exact: true }).click(); await expect(page.getByRole('button', { name: '120 %', exact: true })).toBeVisible();
});
test('importa el esquema anterior, rechaza SVG activo y exporta PNG', async ({ page }) => {
  await page.goto('./'); const content = JSON.stringify({ version: 1, objects: [{ type: 'note', x: 100, y: 100, w: 220, h: 180, text: 'Nota migrada', color: '#ffcc66' }] });
  await page.getByLabel('Archivo de proyecto').setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(content) });
  await expect(page.getByTestId('object-count')).toContainText('1 objetos'); await expect(page.locator('[data-object]')).toContainText('Nota migrada');
  await page.getByLabel('Archivo de imagen').setInputFiles({ name: 'evil.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>') });
  await expect(page.getByRole('status')).toContainText('No se admite SVG');
  await page.locator('.export-menu summary').click(); const event = page.waitForEvent('download'); await page.getByRole('button', { name: 'Imagen visual · PNG' }).click(); const dl = await event; expect(dl.suggestedFilename()).toMatch(/\.png$/);
});
test('portapapeles real de Chromium conserva objetos entre instancias de Bridge', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']); await page.goto('./'); await page.getByRole('button', { name: 'Crear una nota', exact: true }).click(); await page.getByLabel('Contenido del objeto').fill('Nota del portapapeles');
  await page.getByRole('button', { name: /Copiar selección/ }).click(); await expect(page.getByRole('status')).toContainText('Copia lista');
  await page.getByTestId('board-canvas').focus(); await page.keyboard.press('Control+v'); await expect(page.getByTestId('object-count')).toContainText('10 objetos');
  await expect(page.getByLabel('Contenido del objeto')).toHaveValue('Nota del portapapeles');
  await waitSaved(page); const second = await context.newPage(); await second.goto('./'); await expect(second.getByTestId('object-count')).toContainText('10 objetos'); await second.getByTestId('board-canvas').focus(); await second.keyboard.press('Control+v'); await expect(second.getByTestId('object-count')).toContainText('11 objetos'); await expect(second.getByLabel('Contenido del objeto')).toHaveValue('Nota del portapapeles'); await second.close(); await page.bringToFront();
  await page.getByRole('button', { name: 'Compatibility Lab', exact: true }).click(); await page.getByRole('button', { name: 'Inspeccionar portapapeles', exact: true }).click(); await expect(page.locator('.format-output')).toContainText('application/x-whiteboard-bridge+json');
});
test('dibujo con puntero, redimensión, rotación, tinta y borrador', async ({ page }) => {
  await page.goto('./'); await page.getByLabel('Archivo de proyecto').setInputFiles({ name: 'empty.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"objects":[]}') });
  await expect(page.getByTestId('object-count')).toContainText('0 objetos'); const box = (await page.getByTestId('board-canvas').boundingBox())!;
  await page.getByRole('button', { name: 'Rectángulo', exact: true }).click(); await page.mouse.move(box.x + 200, box.y + 150); await page.mouse.down(); await page.mouse.move(box.x + 400, box.y + 300, { steps: 8 }); await page.mouse.up(); await expect(page.getByTestId('object-count')).toContainText('1 objetos');
  const handle = (await page.locator('[data-handle="resize"]').boundingBox())!; await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await page.mouse.down(); await page.mouse.move(handle.x + 70, handle.y + 60, { steps: 8 }); await page.mouse.up(); expect(+(await page.getByLabel('width', { exact: true }).inputValue())).toBeGreaterThan(240);
  const rotate = (await page.locator('[data-handle="rotate"]').boundingBox())!; await page.mouse.move(rotate.x + rotate.width / 2, rotate.y + rotate.height / 2); await page.mouse.down(); await page.mouse.move(rotate.x + 160, rotate.y + 100, { steps: 8 }); await page.mouse.up(); expect(+(await page.getByLabel('rotation', { exact: true }).inputValue())).not.toBe(0);
  await page.getByRole('button', { name: 'Lápiz', exact: true }).click(); await page.mouse.move(box.x + 250, box.y + 450); await page.mouse.down(); await page.mouse.move(box.x + 480, box.y + 520, { steps: 20 }); await page.mouse.up(); await expect(page.getByTestId('object-count')).toContainText('2 objetos');
  await page.getByRole('button', { name: 'Borrador de objetos', exact: true }).click(); await page.mouse.click(box.x + 350, box.y + 480); await expect(page.getByTestId('object-count')).toContainText('1 objetos');
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click(); await expect(page.getByTestId('object-count')).toContainText('2 objetos');
});
test('modo offline, ruta base, manifiesto y recursos locales', async ({ page, context }) => {
  const remote: string[] = []; page.on('request', r => { if (new URL(r.url()).origin !== 'http://127.0.0.1:4173') remote.push(r.url()); });
  await page.goto('./'); await waitSaved(page); await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise<void>(r => navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true })); });
  expect((await page.request.get('manifest.webmanifest')).ok()).toBeTruthy();
  await context.setOffline(true); await page.reload(); await expect(page.getByTestId('object-count')).toContainText('8 objetos'); await page.getByRole('button', { name: 'Crear una nota', exact: true }).click(); await expect(page.getByTestId('object-count')).toContainText('9 objetos'); expect(remote).toEqual([]); await context.setOffline(false);
});
test('móvil a 360 px y laboratorio sin desbordamiento', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 }); await page.goto('./'); await page.getByRole('button', { name: 'Mostrar propiedades', exact: true }).click();
  await expect(page.getByTestId('board-canvas')).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await page.getByRole('button', { name: 'Compatibility Lab', exact: true }).click(); await expect(page.getByRole('dialog')).toBeVisible(); expect(await page.getByRole('dialog').evaluate(e => e.scrollWidth <= e.clientWidth)).toBeTruthy();
});
test('tema oscuro y panel de propiedades con teclado', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: 'Cambiar tema', exact: true }).click(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Crear una nota', exact: true }).click(); await page.getByLabel('Contenido del objeto').fill('Prueba de contraste'); await expect(page.getByLabel('Contenido del objeto')).toHaveValue('Prueba de contraste');
});
