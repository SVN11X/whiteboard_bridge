# Validación de v0.5.0

Fecha: 16-10-2026. Base remota `771ecb1227b11b2846f2e2813ab052e4543a7889`. Ejecutor Linux con Node 24.19.0 y npm 11.9.0. No se añaden ni actualizan dependencias.

## Comandos

```bash
npm ci
npm run check
npm run test:e2e
```

En este entorno se utiliza Chromium con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; el workflow instala su propio navegador. El binario auxiliar y las dependencias no forman parte de la entrega.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| TypeScript y ESLint | Aprobados, sin errores ni advertencias de lint |
| Vitest | 50 pruebas aprobadas en cinco archivos |
| Compilación, PWA y rutas | Base `/whiteboard_bridge/`, cuatro enlaces y nueve recursos offline válidos |
| Playwright completo | 29 pruebas aprobadas, sin reintentos, 48,1 s |
| Revisión visual | Escritorio 1440 px, tableta 820 px y móvil 360 px; paletas, selección, codos, galería y PNG |
| Microsoft Whiteboard | Se conserva el adaptador previo; no se ejecuta una sesión autenticada nueva |
| Publicación remota | No realizada; se entrega el parche para incorporar al repositorio |

La ejecución completa se conserva en `evidence/routing-v0.5-e2e.json`; las medidas de 100/1.000/10.000 objetos, en `routing-v0.5-benchmark.json`. Esas medidas corresponden a figuras simples con descarte fuera de la vista; no garantizan el rendimiento en otro hardware o con todos los objetos visibles.

## Casos de esta actualización

- La paleta de figuras y la barra de selección son blancas incluso con tema oscuro; se ven los doce iconos, incluidas líneas y flechas. Heredan el color configurado para la barra inferior.
- Lados de unión fijos al mover o rotar figuras; los dieciséis pares de lados producen segmentos ortogonales. Los extremos permanecen en el contorno.
- El modo **Fijar conexión en el lienzo** conserva exactamente el recorrido al fijarlo y cuando se mueve una figura. Se comprueban persistencia al recargar, arrastre manual y deshacer.
- El codo manual se conserva al mover figuras; se puede reconectar un extremo a otro lado, deshacerlo y cambiar lado/recorrido desde Propiedades. Elegir Libre desconecta ese extremo.
- Exportación de polilíneas y orientación de las dos puntas; texto de figuras centrado verticalmente, incluido el rombo del diagrama de flujo.
- Esquema de conexiones: ida y vuelta, valores anteriores por defecto, rechazo de coordenadas no normalizadas, un punto aislado o más de 24 puntos. Duplicar remapea referencias y desplaza el codo.
- Doce plantillas con IDs nuevos por inserción, objetos y conexiones editables, búsqueda, categorías, encuadre completo y edición con un clic tras insertar. Deshacer elimina la inserción completa.
- La selección de líneas sigue su trazo real, evitando que un cuadro transparente grande intercepte clics sobre las figuras.
- Se conservan las regresiones de archivos, portapapeles, edición directa, grupos, colores, zoom de 500%, fondo, teclado, offline y rendimiento.

## Evidencia visual y límites

Capturas propias `routing-v0.5-palette-{1440,820,360}.png`, `routing-v0.5-elbow-selected.png`, `routing-v0.5-fixed-after-move.png`, `routing-v0.5-templates-{top,bottom,360}.png` y `routing-v0.5-flow.png`. La exportación raster se conserva en `routing-v0.5-export.png`. Se inspeccionaron visualmente estos archivos; `routing-v0.5-visual.json` registra medidas, doce plantillas, ausencia de desbordamiento móvil y ausencia de errores de página. Las capturas aportadas por el usuario no se redistribuyen.

El recorrido evita los límites de origen y destino; para rodear una tercera figura se ajusta el codo manualmente. La revisión usa Chromium en Linux, aunque su user-agent indique Windows; no verifica un stylus ni un dispositivo táctil físico. El bundle principal conserva el aviso de Vite por superar 500 kB minificados. La evidencia de versiones anteriores se mantiene como historial.
