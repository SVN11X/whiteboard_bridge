import { test, expect } from '@playwright/test';
import { openProperties, openSettings } from './workspace-helpers';
import { whiteboardPayload } from '../../src/clipboard/whiteboard';

test.beforeEach(async ({ page }) => { await page.goto('./'); await expect(page.locator('.loading-cover')).toHaveCount(0); });

test('la página ofrece el paquete del agente de IA para copiar y descargar', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openSettings(page); await page.locator('.settings-menu').getByRole('button', { name: 'Crear con un agente de IA', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear pizarras con un agente de IA' }); await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/de 8\.000 caracteres permitidos/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Copiar Instrucciones', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Se copió «Instrucciones»');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('# Rol'); expect([...copied].length).toBeLessThanOrEqual(8000);
  for (const file of ['instrucciones.txt', 'conocimiento-pizarras-bridge.txt', 'configuracion.txt', 'ejemplo-pizarra.json']) {
    const link = dialog.getByRole('link', { name: `Descargar ${file}`, exact: true });
    await expect(link).toHaveAttribute('href', `/whiteboard_bridge/agente/${file}`);
    expect((await page.request.get(`agente/${file}`)).ok()).toBe(true);
  }
  expect(await (await page.request.get('agente/conocimiento-pizarras-bridge.txt')).text()).toContain('CONOCIMIENTO DEL GENERADOR DE PIZARRAS BRIDGE');
});

test('el ejemplo del agente se abre en Bridge y se copia completo para Microsoft Whiteboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Más herramientas', exact: true }).click(); await page.getByRole('button', { name: 'Crear con IA', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abrir el ejemplo en Bridge', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Proyecto importado'); await expect(page.getByTestId('board-canvas')).toHaveAttribute('data-object-count', '10');
  await openProperties(page); await page.getByLabel('Formato de copia').selectOption('microsoft');
  await page.getByTestId('board-canvas').focus(); await page.keyboard.press('Control+a');
  await page.getByRole('button', { name: 'Copiar objetos seleccionados', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Copia lista para Microsoft Whiteboard.');
  const html = await page.evaluate(async () => { const entries = await navigator.clipboard.read(); const item = entries.find(entry => entry.types.includes('text/html'))!; return (await item.getType('text/html')).text(); });
  const payload = whiteboardPayload(html) as { boardItems: { content: { contentType: string } }[] };
  expect(payload.boardItems).toHaveLength(10); expect(new Set(payload.boardItems.map(item => item.content.contentType))).toEqual(new Set(['shape', 'plaintext', 'note']));
});

test('un archivo del agente con errores indica el objeto y el campo, y el diálogo cabe en 360 px', async ({ page }) => {
  const example = await (await page.request.get('agente/ejemplo-pizarra.json')).json(); delete example.objects[3].label;
  await page.getByLabel('Archivo de proyecto').setInputFiles({ name: 'agente.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(example)) });
  await expect(page.getByRole('alert')).toContainText(`objeto 4 (id ${example.objects[3].id}), campo label`);
  await page.setViewportSize({ width: 360, height: 800 });
  await openSettings(page); await page.locator('.settings-menu').getByRole('button', { name: 'Crear con un agente de IA', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Crear pizarras con un agente de IA' }); await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});
