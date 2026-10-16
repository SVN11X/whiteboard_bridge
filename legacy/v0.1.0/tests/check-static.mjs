import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
for(const file of ['web/index.html','web/styles.css','web/app.js','windows/Inspect-Clipboard.ps1','docs/ARQUITECTURA.md','docs/MATRIZ_PRUEBAS.md']){
  assert.ok(existsSync(join(root,file)),`${file} no existe`);
}
const html=readFileSync(join(root,'web/index.html'),'utf8');
const js=readFileSync(join(root,'web/app.js'),'utf8');
const ps=readFileSync(join(root,'windows/Inspect-Clipboard.ps1'),'utf8');
for(const marker of ['copy-selection','inspect-clipboard','record-test','export-results','board'])assert.ok(html.includes(`id="${marker}"`));
for(const marker of ['navigator.clipboard.read','navigator.clipboard.write','image/png','text/html','web application/x-whiteboard-bridge-lab+json'])assert.ok(js.includes(marker));
for(const marker of ['OpenClipboard','EnumClipboardFormats','GetClipboardFormatName','GetClipboardData','GlobalSize'])assert.ok(ps.includes(marker));
assert.ok(!js.includes('fetch('),'El prototipo no debe hacer solicitudes de red');
console.log('OK: archivos, controles y rutas de prueba. Este test NO demuestra compatibilidad nativa con Microsoft Whiteboard.');
