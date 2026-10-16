# Validación ejecutada

Fecha: 16-10-2026. Proyecto base recibido en ZIP, sin publicación remota. Ejecutor Linux con Node 24.19.0, npm 11.9.0. Dependencias exactas en package-lock.json.

## Comandos

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

En Linux limpio, `npx playwright install --with-deps chromium` instala también librerías del sistema. El workflow hace esa instalación.

En este entorno la descarga estándar de Playwright devolvió un ZIP incompleto. Para ejecutar las pruebas se utilizó un binario Chromium preparado localmente, indicando su ruta mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Ese binario auxiliar no forma parte de la aplicación ni del ZIP. El navegador manejado por Playwright informó user agent `Chrome/156.0.8078.4`; ese dato no certifica una instalación de Chrome/Edge Windows de un usuario real.

## Resultado final

| Comprobación | Estado | Alcance |
| --- | --- | --- |
| TypeScript estricto | Aprobado | Código, configuración y pruebas |
| ESLint | Aprobado | Sin errores ni advertencias |
| Vitest | Aprobado | 29 pruebas, 3 archivos |
| Vite producción + SW | Aprobado | Recursos compilados bajo `/whiteboard-bridge/` |
| Playwright | Aprobado | 13 pruebas, Chromium automatizado |
| Test estático del legado | Aprobado | Se conserva ejecutable; no valida natividad |
| Whiteboard Web/Teams real | No ejecutado | Requiere cuenta y comprobación manual externa |
| Edge/Chrome en Windows y stylus físico | No ejecutado | No se extrapolan resultados del navegador automatizado |
| Workflow en GitHub / URL pública | No ejecutado | Preparado; no existe evidencia de publicación |

Evidencia de la última suite E2E: [e2e-results.json](evidence/e2e-results.json). Se incluyen resultados de datos sintéticos, sin capturas de sesiones ajenas.

## Qué verifican las pruebas

Actualización v0.3.0: round-trip `.wbridge` con grupos, conectores, tinta e imágenes; apertura como copia; exportación de selección con relaciones externas eliminadas; BOM UTF-8; nombres seguros; JSON anteriores; límites de tamaño y firma raster. En navegador se verificó archivo descargado y reimportado, edición tras recarga, conservación de la pizarra anterior, selección, Ctrl+S, botón Importar con imagen, rechazo de `.whiteboard`/archivos corruptos, arrastrar proyecto y guía responsive con ejemplo descargable.


- Documento: round-trip exacto, migración del JSON v1, valores inválidos, IDs duplicados, imágenes activas y ciclos de grupo.
- Geometría: zoom anclado al cursor, límites rotados, índice espacial con coordenadas negativas y objetos grandes, orientación de conectores.
- Estado: agrupación, movimiento, duplicación, referencias nuevas, undo, bloqueo, desagrupación anidada y eliminación de ancestros vacíos.
- Representación: texto escapado, palabras largas sin pérdida y rechazo de un resultado PNG como prueba de natividad.
- IndexedDB: orden de escrituras, última edición, respaldo/restauración como copias, rechazo atómico de respaldo inválido y eliminación de versiones.
- Navegador: creación, edición, duplicación, undo, JSON descargable y persistencia tras recargar; agrupación, bloqueo y zoom por teclado/panel; migración, rechazo de SVG y descarga PNG; Clipboard real con formato propio y pegado entre pestañas; puntero con resize/rotación/tinta/borrador; recarga offline y ausencia de solicitudes de contenido a otros orígenes; móvil 360 px; tema oscuro.

Los tests de Clipboard usan permiso de lectura/escritura en un contexto de pruebas sintético. No equivalen a demostrar permisos en todos los perfiles o destinos. La comprobación móvil asegura distribución y ausencia de overflow; no certifica gestos en hardware táctil.

## Fallos encontrados y corregidos

La primera suite detectó que `Vary: Origin` del servidor de preview hacía fallar el cache match del CSS/JS al recargar offline. El SW ahora resuelve por URL explícita del precache y permite ignorar Vary solo dentro de esa caché del mismo origen. La suite posterior recargó y editó sin conexión.

Se corrigió el nombre accesible del botón del laboratorio, cuyo texto se oculta en móvil. También se ajustó una aserción que buscaba texto con espacios entre `tspan`: la nota estaba guardada, pero la representación divide sus líneas. Ahora se comprueba la etiqueta accesible completa del objeto y su recarga.

## Medición de rendimiento

```powershell
npm run build
npm run benchmark
```

Datos brutos: [benchmark.json](evidence/benchmark.json). Figuras rectangulares simples distribuidas en una rejilla, viewport configurado 1440×900, tres tamaños de documento. El ensayo desplaza el viewport durante 120 frames y descarta los cinco primeros intervalos. Después mide un clic de zoom hasta que la UI confirma el valor.

| Objetos en documento | Importación + comprobación (ms) | Zoom + comprobación (ms) | FPS medio al desplazar | Frame p95 (ms) | Heap JS vía CDP (MiB) | Objetos SVG al final |
| --- | --- | --- | --- | --- | --- | --- |
| 100 | 61 | 63 | 60,0 | 18,7 | 7,5 | 6 |
| 1.000 | 113 | 85 | 60,0 | 18,4 | 23,4 | 42 |
| 10.000 | 734 | 76 | 60,1 | 19,6 | 41,2 | 42 |

Estas cifras son una ejecución automatizada, no una garantía de hardware ni un benchmark comparativo de librerías. El culling mantiene pocos objetos visibles. El tiempo de interacción incluye Playwright y la comprobación, no solo trabajo de render. El heap vía CDP no incluye toda la memoria del proceso, GPU o IndexedDB; puede incluir asignaciones aún no recolectadas. `performance.memory` también se registra, pero apareció cuantizado y no se usa como cifra principal.

No se midieron 10.000 imágenes/trazos densos simultáneamente visibles ni precisión de presión física. No se afirman 60 FPS para esas cargas.

## Revisión visual

En v0.3.0 se inspeccionaron la barra con Importar/Exportar en escritorio y la guía de archivos a 360 px. La tabla conserva un ancho legible y ofrece desplazamiento horizontal con indicación visible y foco por teclado; se repitieron las cuatro pruebas de archivos tras ese ajuste de presentación.

Se inspeccionaron capturas sintéticas de escritorio y móvil para localizar fallos. La suite verifica oscuro y diálogos adaptables. No se incluyen esas capturas como evidencia de Microsoft. La revisión completa con lector de pantalla y WCAG 2.2 AA sigue pendiente.

## Aviso de compilación

Vite informa que el bundle principal supera 500 kB minificados (aprox. 532 kB; 168 kB gzip). Es un aviso de tamaño, no un error. Se mantiene un paquete local autocontenido y la PWA lo precachea. La división en chunks y las escenas densas son mejoras de rendimiento futuras; no se oculta el aviso modificando artificialmente el umbral.
