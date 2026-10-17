import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// GitHub supplies this variable in Actions; local builds use the actual repository.
const repository = process.env.GITHUB_REPOSITORY || 'SVN11X/whiteboard_bridge';
assert.match(repository, /^[\w.-]+\/[\w.-]+$/, 'GITHUB_REPOSITORY debe ser propietario/repositorio');
const base = `/${repository.split('/')[1]}/`;
const origin = 'https://pages.invalid';
const output = resolve('dist');

async function checkResource(reference) {
  const url = new URL(reference, origin + base);
  assert.equal(url.origin, origin, `Recurso externo inesperado: ${reference}`);
  assert.ok(url.pathname.startsWith(base), `Ruta incorrecta: ${reference}. Se esperaba ${base} para ${repository}. Revisa vite.config.ts y scripts/build-sw.mjs.`);
  const file = resolve(output, decodeURIComponent(url.pathname.slice(base.length)) || 'index.html');
  assert.ok(file.startsWith(output + sep), `Recurso fuera de dist: ${reference}`);
  await access(file);
}

const html = await readFile('dist/index.html', 'utf8');
const references = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map(match => match[1]);
assert.ok(references.some(reference => reference.endsWith('.js')), 'Falta el módulo JavaScript');
assert.ok(references.some(reference => reference.endsWith('.css')), 'Falta la hoja de estilos');
for (const reference of references) await checkResource(reference);

const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
for (const key of ['start_url', 'scope']) assert.equal(new URL(manifest[key], origin + base).pathname, base, `El manifiesto tiene un ${key} incorrecto`);
for (const icon of manifest.icons) await checkResource(icon.src);

const worker = await readFile('dist/sw.js', 'utf8');
assert.equal(JSON.parse(worker.match(/\bBASE=("[^"]+")/)?.[1] || 'null'), base, 'La base del service worker no coincide con GitHub Pages');
const precache = JSON.parse(worker.match(/\bURLS=(\[[^\n;]*\])/)?.[1] || 'null');
assert.ok(Array.isArray(precache), 'Falta la lista de recursos offline');
for (const reference of precache) await checkResource(reference);
for (const file of ['', 'index.html', 'manifest.webmanifest', 'examples/primer-proyecto.wbridge', 'agente/instrucciones.txt', 'agente/conocimiento-pizarras-bridge.txt', 'agente/configuracion.txt', 'agente/ejemplo-pizarra.json']) assert.ok(precache.includes(base + file), `Falta ${base + file} en la caché offline`);
console.log(`GitHub Pages: ${base}, ${references.length} enlaces y ${precache.length} recursos offline válidos.`);
