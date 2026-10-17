# Validación

## v0.6.0

Fecha: 17-10-2026. Base `df59f64d2c4b1a479262d0f02091288863444d84`. Rama local `feat/agente-ia`. Ejecutor Linux con Node 22.22.2. No se añaden ni actualizan dependencias.

| Comprobación | Resultado |
| --- | --- |
| TypeScript y ESLint | Aprobados, sin advertencias |
| Vitest | 57 pruebas aprobadas en seis archivos, incluidas las 5 de `agent.test.ts` |
| Compilación, PWA y rutas | Base `/whiteboard_bridge/`, cuatro enlaces y 13 recursos offline válidos, incluidos los cuatro archivos del agente |
| Playwright completo | 32 pruebas aprobadas, incluidas las 3 de `agent.spec.ts` |
| Revisión visual | Diálogo del agente a 1440 y 360 px, tema oscuro y paleta Más herramientas. Capturas `evidence/agent-v0.6-dialog-1440.png` y `agent-v0.6-dialog-360.png` |
| Script Python del conocimiento | Ejecutado con Python 3.12 fuera de CI. Genera el ejemplo, su conteo de líneas coincide con Bridge en 3.300 combinaciones y su validador detecta los errores de la lista de verificación |
| Microsoft 365 Copilot | No se ejecutó una sesión del creador de agentes. Los límites usados provienen de la documentación de Microsoft Learn |
| Publicación remota | No realizada |

Casos nuevos:

- El paquete del agente cumple 30 caracteres de nombre, 1.000 de descripción y 8.000 de instrucciones.
- Instrucciones y conocimiento nombran las siete figuras, los 12 colores de notas y los tipos prohibidos que usa el codificador de Microsoft.
- El ejemplo se importa, se copia a Microsoft con 10 objetos y sin advertencias, y no tiene textos cortados. El ejemplo dentro del conocimiento es idéntico al archivo publicado.
- La tabla de errores del conocimiento coincide con los mensajes reales de nueve errores frecuentes.
- Los errores de importación indican el objeto y el campo, también en el navegador.
- El diálogo copia las instrucciones al portapapeles, enlaza los cuatro archivos, abre el ejemplo y cabe en 360 px.
- La migración v1 conserva el texto de rectángulos y elipses.

La ejecución completa de Playwright se conserva en `evidence/agent-v0.6-e2e.json`.

## v0.5.0

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
