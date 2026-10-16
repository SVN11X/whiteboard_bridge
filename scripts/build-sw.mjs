import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = '/whiteboard_bridge/';
async function walk(dir) { const out = []; for (const item of await readdir(dir, { withFileTypes: true })) { const path = `${dir}/${item.name}`; if (item.isDirectory()) out.push(...await walk(path)); else if (item.name !== 'sw.js') out.push(path); } return out; }
const files = (await walk('dist')).sort();
const hash = createHash('sha256'); for (const file of files) hash.update(await readFile(file));
const cache = `whiteboard-bridge-${hash.digest('hex').slice(0, 12)}`;
const urls = files.map(file => base + file.slice(5));
urls.push(base);
const source = `/* Generated precache, same origin only. User controls activation. */
const CACHE=${JSON.stringify(cache)}, PREFIX='whiteboard-bridge-', BASE=${JSON.stringify(base)}, URLS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(URLS))));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match(BASE+'index.html',{ignoreVary:true}))));
 else if(URLS.includes(url.pathname))event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname,{ignoreSearch:true,ignoreVary:true})).then(hit=>hit||fetch(event.request)));
});
`;
await writeFile('dist/sw.js', source); console.log(`PWA: ${urls.length} resources, ${cache}`);
