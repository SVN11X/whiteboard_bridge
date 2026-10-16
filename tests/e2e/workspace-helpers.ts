import { expect, type Page } from '@playwright/test';
import { demoBoard } from '../../src/models/document';

export async function openSettings(page: Page) {
  if (!await page.locator('.settings-menu').isVisible()) await page.getByRole('button', { name: 'Configuración', exact: true }).click();
}
export async function openExport(page: Page) { await openSettings(page); await page.locator('.export-menu summary').click(); }
export async function openProperties(page: Page) {
  if (!await page.getByRole('complementary', { name: 'Propiedades y capas' }).isVisible()) { await openSettings(page); await page.locator('.settings-menu').getByRole('button', { name: 'Mostrar propiedades', exact: true }).click(); }
}
export async function openLab(page: Page) { await openSettings(page); await page.locator('.settings-menu').getByRole('button', { name: 'Compatibility Lab', exact: true }).click(); }
// Regression fixtures are explicit; a real first visit now starts with a blank board.
export async function seedExample(page: Page) {
  await page.goto('./'); await expect(page.locator('.loading-cover')).toHaveCount(0);
  await page.getByLabel('Archivo de proyecto').setInputFiles({ name: 'fixture.wbridge', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(demoBoard())) });
  await expect(page.getByRole('status')).toContainText('Proyecto importado');
  await openSettings(page); await page.locator('.settings-menu').getByRole('button', { name: 'Ayuda', exact: true }).click();
  await page.getByLabel('Nombre de esta pizarra').fill('El próximo gran paso'); await page.getByLabel('Nombre de esta pizarra').press('Tab'); await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
  await openProperties(page); await page.getByLabel('Formato de copia').selectOption('custom');
}
