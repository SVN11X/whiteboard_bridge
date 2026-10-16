'use strict';
// Whiteboard Bridge Lab: no network requests, no third-party dependencies.
// This is an experimental editor. It does NOT claim to generate Microsoft Whiteboard's private native format.

const SVG_NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const allowedTypes = new Set(['text','note','rect','ellipse','arrow']);
const state = {
  objects: [], selected: new Set(), dragging: null, tests: [], inspectedFormats: [],
  lastMode: null, nextId: 1
};
const deepCopy = (value) => JSON.parse(JSON.stringify(value));
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, number(v)));
const makeId = () => `obj-${state.nextId++}`;
const byId = (id) => state.objects.find((o) => o.id === id);
const selection = () => state.objects.filter((o) => state.selected.has(o.id));
const notice = (message) => { $('status').textContent = `${new Date().toLocaleTimeString('es-CL')} · ${message}`; };

function makeObject(type, x, y) {
  const base = {id:makeId(),type,x,y,w:220,h:120,text:'',color:'#8b5cf6'};
  if(type === 'text') return {...base,w:260,h:100,text:'Título editable',color:'#1f2937'};
  if(type === 'note') return {...base,w:240,h:180,text:'Escribe aquí una nota\neditable',color:'#fde68a'};
  if(type === 'rect') return {...base,w:225,h:120,color:'#a5b4fc'};
  if(type === 'ellipse') return {...base,w:230,h:140,color:'#99f6e4'};
  return {...base,w:240,h:100,color:'#4f46e5'};
}

function elem(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
  if(parent) parent.appendChild(el);
  return el;
}

function wrapLines(text, maxChars = 23) {
  const raw = String(text || '').split(/\r?\n/);
  const lines = [];
  for(const section of raw){
    if (!section) {lines.push('');continue;}
    let line = '';
    for(const word of section.split(/\s+/)){
      if(!word)continue;
      if(line && (line.length+1+word.length > maxChars)) {lines.push(line);line='';}
      if(word.length>maxChars) {
        if(line){lines.push(line);line='';}
        for(let i=0;i<word.length;i+=maxChars) lines.push(word.slice(i,i+maxChars));
      } else line = line ? `${line} ${word}` : word;
    }
    if(line)lines.push(line);
  }
  return lines.slice(0,15);
}

function renderObject(obj, parent, showSelection = true) {
  const group = elem('g',{'data-id':obj.id,'class':`item${showSelection && state.selected.has(obj.id)?' selected':''}`,'transform':`translate(${obj.x} ${obj.y})`},parent);
  if(obj.type === 'note') {
    elem('rect',{width:obj.w,height:obj.h,rx:7,fill:obj.color,stroke:'#d1b671','stroke-width':1.5},group);
    elem('path',{d:`M ${obj.w-36} 0 L ${obj.w-36} 35 L ${obj.w} 35`,fill:'none',stroke:'#0002','stroke-width':1.5},group);
  }
  if(obj.type === 'rect') elem('rect',{width:obj.w,height:obj.h,rx:8,fill:obj.color,stroke:'#0002','stroke-width':1.5},group);
  if(obj.type === 'ellipse') elem('ellipse',{cx:obj.w/2,cy:obj.h/2,rx:obj.w/2,ry:obj.h/2,fill:obj.color,stroke:'#0002','stroke-width':1.5},group);
  if(obj.type === 'arrow'){
    elem('line',{x1:14,y1:obj.h/2,x2:obj.w-24,y2:obj.h/2,stroke:obj.color,'stroke-width':9,'stroke-linecap':'round'},group);
    elem('path',{d:`M ${obj.w-56} ${obj.h/2-26} L ${obj.w-16} ${obj.h/2} L ${obj.w-56} ${obj.h/2+26}`,fill:'none',stroke:obj.color,'stroke-width':9,'stroke-linejoin':'round','stroke-linecap':'round'},group);
  }
  if(obj.type === 'text'||obj.type === 'note'){
    const color = obj.type === 'note' ? '#374151' : obj.color;
    const fontSize = obj.type==='note'?20:24;
    const txt = elem('text',{x:obj.type==='note'?17:3,y:obj.type==='note'?32:29,fill:color,'font-size':fontSize,'font-weight':obj.type==='text'?'600':'400','font-family':'Segoe UI, Arial, sans-serif'},group);
    wrapLines(obj.text,obj.type==='note'?20:22).forEach((line,idx)=>{
      const span = elem('tspan',{x:obj.type==='note'?17:3,dy:idx?fontSize*1.22:0},txt);
      span.textContent = line || ' ';
    });
    // Hit target so empty portions of a text object remain selectable.
    elem('rect',{width:obj.w,height:obj.h,fill:'transparent'},group);
  }
  if(showSelection && state.selected.has(obj.id)) elem('rect',{'class':'select-border',x:-6,y:-6,width:obj.w+12,height:obj.h+12,rx:5},group);
  return group;
}

function render() {
  const board = $('board');
  board.replaceChildren();
  // SVG selection is solely our editor's local state, not a claim of Whiteboard interoperability.
  state.objects.forEach((o)=>renderObject(o,board));
  $('board-count').textContent = `${state.objects.length} objetos · ${state.selected.size} seleccionados`;
  const chosen = selection()[0];
  $('editor').hidden = !chosen;
  $('editor-empty').hidden = !!chosen;
  if(chosen){
    $('type-label').textContent = chosen.type;
    $('text-value').parentElement.querySelector('label[for="text-value"]').style.display = ['text','note'].includes(chosen.type)?'block':'none';
    $('text-value').style.display = ['text','note'].includes(chosen.type)?'block':'none';
    if(document.activeElement !== $('text-value')) $('text-value').value = chosen.text;
    if(document.activeElement !== $('color-value')) $('color-value').value = chosen.color;
    if(document.activeElement !== $('pos-x')) $('pos-x').value = Math.round(chosen.x);
    if(document.activeElement !== $('pos-y')) $('pos-y').value = Math.round(chosen.y);
  }
  const list = $('object-list');list.replaceChildren();
  for(const o of state.objects){
    const item = document.createElement('button');item.className=`object-item${state.selected.has(o.id)?' is-selected':''}`;
    item.textContent = `${o.type.toUpperCase()} · ${o.text?o.text.replace(/\s+/g,' ').slice(0,26):o.id}`;
    item.addEventListener('click',()=>{state.selected=new Set([o.id]);render();});
    list.appendChild(item);
  }
}

function toLocalPoint(evt){
  const matrix=$('board').getScreenCTM();
  if(!matrix)return {x:0,y:0};
  const p = new DOMPoint(evt.clientX,evt.clientY).matrixTransform(matrix.inverse());
  return {x:p.x,y:p.y};
}

function installCanvasInteractions(){
  $('board').addEventListener('pointerdown',(evt)=>{
    if(evt.button!==0)return;
    const group=evt.target.closest('g.item');
    if(!group){ if(!evt.shiftKey){state.selected.clear();render();}return; }
    const id=group.getAttribute('data-id');
    if(evt.shiftKey){ if(state.selected.has(id))state.selected.delete(id);else state.selected.add(id);render();return; }
    if(!state.selected.has(id))state.selected=new Set([id]);
    const p=toLocalPoint(evt);
    state.dragging={pointerId:evt.pointerId,start:p,initial:selection().map((o)=>({id:o.id,x:o.x,y:o.y}))};
    $('board').setPointerCapture(evt.pointerId);
    render();evt.preventDefault();
  });
  $('board').addEventListener('pointermove',(evt)=>{
    if(!state.dragging||state.dragging.pointerId!==evt.pointerId)return;
    const p=toLocalPoint(evt);
    for(const orig of state.dragging.initial){const o=byId(orig.id);if(o){o.x=clamp(orig.x+p.x-state.dragging.start.x,-10000,10000);o.y=clamp(orig.y+p.y-state.dragging.start.y,-10000,10000);}}
    render();
  });
  const end=(evt)=>{if(state.dragging && state.dragging.pointerId===evt.pointerId){state.dragging=null;try{$('board').releasePointerCapture(evt.pointerId);}catch{}}};
  $('board').addEventListener('pointerup',end);
  $('board').addEventListener('pointercancel',end);
}

function selectedRequired(){
  const items=selection();
  if(!items.length)throw new Error('Selecciona al menos un objeto en el lienzo.');
  return items;
}

function plainFor(items){return items.map((o)=>o.text || `[${o.type} editable en Whiteboard Bridge]`).join('\n');}
function htmlFor(items){
  const chunks=items.map((o)=>{
    if(o.type==='text')return `<p style="color:${o.color};font-size:20px">${esc(o.text).replace(/\n/g,'<br>')}</p>`;
    if(o.type==='note')return `<div style="background:${o.color};padding:18px;margin:8px 0;min-height:90px;white-space:pre-wrap">${esc(o.text)}</div>`;
    return `<div data-bridge-object="${o.type}" style="border:2px solid ${o.color};padding:8px;margin:4px">[${esc(o.type)}]</div>`;
  }).join('');
  return `<html><body><!--StartFragment--><div>${chunks}</div><!--EndFragment--></body></html>`;
}
function customFor(items){return JSON.stringify({schema:'https://whiteboard-bridge-lab.invalid/schemas/objects-v1',version:1,items:deepCopy(items)},null,2);}
function blob(value,type){return new Blob([value],{type});}

function pngFor(items){
  return new Promise((resolve,reject)=>{
    const x=Math.min(...items.map((o)=>o.x))-16;
    const y=Math.min(...items.map((o)=>o.y))-16;
    const maxX=Math.max(...items.map((o)=>o.x+o.w))+16;
    const maxY=Math.max(...items.map((o)=>o.y+o.h))+16;
    const w=Math.max(1,Math.ceil(maxX-x)),h=Math.max(1,Math.ceil(maxY-y));
    if(w>4500||h>4500||w*h>12_000_000){reject(new Error('Selección demasiado grande para PNG de prueba.'));return;}
    const svg=elem('svg',{xmlns:SVG_NS,width:w,height:h,viewBox:`${x} ${y} ${w} ${h}`});
    const background=elem('rect',{x,y,width:w,height:h,fill:'#ffffff'},svg);
    for(const o of items)renderObject(o,svg,false);
    const payload=new XMLSerializer().serializeToString(svg);
    const url=URL.createObjectURL(blob(payload,'image/svg+xml'));
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d');
      if(!ctx){URL.revokeObjectURL(url);reject(new Error('Canvas 2D no disponible.'));return;}
      ctx.drawImage(img,0,0);URL.revokeObjectURL(url);
      canvas.toBlob((result)=>result?resolve(result):reject(new Error('Error al generar PNG.')),'image/png');
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No se pudo representar la selección como PNG.'));};
    img.src=url;
  });
}

async function copySelection(){
  const items=selectedRequired();const mode=$('copy-mode').value;
  const plain=blob(plainFor(items),'text/plain');const html=blob(htmlFor(items),'text/html');
  const custom=blob(customFor(items),'application/x-whiteboard-bridge-lab+json');
  if(!navigator.clipboard)throw new Error('El portapapeles requiere localhost o HTTPS y permisos del navegador.');
  if(mode==='plain')await navigator.clipboard.writeText(plainFor(items));
  else if(mode==='png')await navigator.clipboard.write([new ClipboardItem({'image/png':pngFor(items)})]);
  else if(mode==='html')await navigator.clipboard.write([new ClipboardItem({'text/plain':plain,'text/html':html})]);
  else if(mode==='custom')await navigator.clipboard.write([new ClipboardItem({'text/plain':plain,'text/html':html,'web application/x-whiteboard-bridge-lab+json':custom})]);
  else if(mode==='mixed')await navigator.clipboard.write([new ClipboardItem({'text/plain':plain,'text/html':html,'image/png':pngFor(items),'web application/x-whiteboard-bridge-lab+json':custom})]);
  state.lastMode=mode;
  notice(`Copiados ${items.length} objetos en modo «${$('copy-mode').selectedOptions[0].textContent}». Ahora pega en Whiteboard y verifica manualmente el tipo de objeto.`);
}

async function inspectClipboard(){
  if(!navigator.clipboard?.read)throw new Error('La lectura requiere navegador compatible, localhost/HTTPS y permiso explícito.');
  const entries=await navigator.clipboard.read();
  const formats=[];
  for(const item of entries){
    for(const type of item.types){
      try{const data=await item.getType(type);formats.push({type,bytes:data.size});}
      catch(e){formats.push({type,error:e.message});}
    }
  }
  state.inspectedFormats=formats;
  $('clipboard-results').textContent=formats.length ? formats.map((f)=>`${f.type} · ${f.bytes===undefined?'acceso denegado':`${f.bytes} bytes`}`).join('\n'):'No se informaron tipos.';
  notice('Tipos visibles desde la API web inspeccionados (no equivale a todos los formatos nativos de Windows).');
}

function downloadJson(name,obj){
  const url=URL.createObjectURL(blob(JSON.stringify(obj,null,2),'application/json'));
  const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function addRecord(){
  const row={timestamp:new Date().toISOString(),target:'Whiteboard Web/Teams (indicar variante en observaciones)',object:$('test-object').value,mode:state.lastMode||$('copy-mode').value,status:$('test-status').value,note:$('test-note').value.slice(0,1000)};
  state.tests.push(row);$('test-count').textContent=`${state.tests.length} pruebas registradas`;
  $('test-note').value='';notice('Resultado manual registrado en esta sesión. Descarga el reporte antes de cerrar.');
}

function loadBoard(raw){
  if(!raw || !Array.isArray(raw.objects) || raw.objects.length>1000)throw new Error('Archivo no válido o demasiado grande.');
  state.objects=raw.objects.map((o,i)=>{
    if(!allowedTypes.has(o.type))throw new Error(`Objeto #${i+1} con tipo desconocido.`);
    return {id:makeId(),type:o.type,x:clamp(o.x,-10000,10000),y:clamp(o.y,-10000,10000),w:clamp(o.w,10,2500),h:clamp(o.h,10,2500),text:String(o.text||'').slice(0,2000),color:/^#[0-9a-fA-F]{6}$/.test(o.color)?o.color:'#8b5cf6'};
  });
  state.selected.clear();render();notice(`Proyecto cargado (${state.objects.length} objetos).`);
}

function handleError(context,e){notice(`${context}: ${e instanceof Error?e.message:String(e)}`);}
function install(){
  document.querySelectorAll('[data-add]').forEach((button)=>button.addEventListener('click',()=>{
    const n=state.objects.length;const obj=makeObject(button.dataset.add,55+(n%5)*55,75+(n%5)*45);
    state.objects.push(obj);state.selected=new Set([obj.id]);render();
  }));
  installCanvasInteractions();
  $('text-value').addEventListener('input',(e)=>{const o=selection()[0];if(o){o.text=e.target.value;render();}});
  $('color-value').addEventListener('input',(e)=>{const o=selection()[0];if(o){o.color=e.target.value;render();}});
  for(const key of ['x','y'])$('pos-'+key).addEventListener('change',(e)=>{const o=selection()[0];if(o){o[key]=clamp(e.target.value,-10000,10000);render();}});
  $('delete-selected').addEventListener('click',()=>{state.objects=state.objects.filter((o)=>!state.selected.has(o.id));state.selected.clear();render();});
  $('copy-selection').addEventListener('click',()=>copySelection().catch((e)=>handleError('No se pudo copiar',e)));
  $('inspect-clipboard').addEventListener('click',()=>inspectClipboard().catch((e)=>handleError('No se pudo inspeccionar',e)));
  $('record-test').addEventListener('click',addRecord);
  $('export-results').addEventListener('click',()=>downloadJson('whiteboard-bridge-resultados.json',{app:'Whiteboard Bridge Lab',version:'0.1.0',created:new Date().toISOString(),tests:state.tests,visibleClipboardFormats:state.inspectedFormats,warning:'Los resultados de edición nativa son observaciones manuales; no han sido verificados automáticamente.'}));
  $('export-board').addEventListener('click',()=>downloadJson('whiteboard-bridge-proyecto.json',{version:1,objects:state.objects}));
  $('import-board').addEventListener('change',async(e)=>{try{const file=e.target.files?.[0];if(!file)return;if(file.size>2_000_000)throw new Error('Archivo demasiado grande.');loadBoard(JSON.parse(await file.text()));}catch(err){handleError('No se pudo importar',err);}finally{e.target.value='';}});
  document.addEventListener('keydown',(e)=>{
    const tag=document.activeElement?.tagName;
    if(['INPUT','TEXTAREA','SELECT'].includes(tag)||document.activeElement?.isContentEditable)return;
    if((e.key==='Delete'||e.key==='Backspace')&&state.selected.size){e.preventDefault();state.objects=state.objects.filter((o)=>!state.selected.has(o.id));state.selected.clear();render();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'&&state.selected.size){e.preventDefault();copySelection().catch((err)=>handleError('No se pudo copiar',err));}
  });
  for(const obj of [makeObject('text',85,65),makeObject('note',85,220),makeObject('rect',440,95),makeObject('ellipse',750,90),makeObject('arrow',440,330)])state.objects.push(obj);
  state.objects[0].text='Whiteboard Bridge';
  state.objects[1].text='PRUEBA DE PEGADO\n¿Conserva su tipo en Whiteboard?';
  state.selected.add(state.objects[1].id);
  render();
  if(!window.isSecureContext)notice('Abre esta página en http://localhost:8000 (no desde una URL remota insegura).');
}
document.addEventListener('DOMContentLoaded',install);
