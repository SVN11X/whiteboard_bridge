# Validación de v0.4.1

Fecha: 16-10-2026. Base remota `c42b4410e9cb7975df6f80155e13579c20479dd7`. Ejecutor Linux con Node 24.19.0 y npm 11.9.0. No se añaden ni actualizan dependencias.

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
| Vitest | 40 pruebas en cuatro archivos |
| Compilación, PWA y rutas | Base `/whiteboard_bridge/`, cuatro enlaces y nueve recursos offline válidos |
| Playwright completo | 25 pruebas aprobadas sin reintentos, 42,6 s |
| Casos finales después de la revisión | 5 aprobados sin reintentos, 6,0 s |
| Revisión visual | Escritorio 1440 px, tableta 820 px y móvil 360 px; barras blancas/personalizadas, puntos de conexión y PNG |
| Microsoft Whiteboard | El usuario confirmó el pegado de v0.4.0; no se atribuye a una prueba automatizada autenticada |
| Publicación remota | No realizada; se entrega el parche para incorporar al repositorio |

La ejecución completa se conserva en `evidence/compact-v0.4.1-e2e.json`; las medidas de 100/1.000/10.000 objetos, en `compact-v0.4.1-benchmark.json`. Esas medidas corresponden a figuras simples con descarte de objetos fuera de la vista; no son una garantía de rendimiento en otro hardware.

## Casos de esta actualización

- Alto real de cabecera, barra inferior y zoom de 40 px en escritorio; fondo blanco también con tema oscuro.
- Edición independiente de colores, contraste de texto e iconos, persistencia al recargar y restauración a blanco.
- Ausencia del contador visual; las pruebas consultan metadatos del SVG para comprobar importaciones sin añadir un contador a la interfaz.
- Límite del 500% con botones, Ctrl+rueda y eventos táctiles reales de dos dedos enviados por CDP. Archivos antiguos con vista de 800% se abren al 500% sin perder objetos.
- Flecha hasta el borde, movimiento de las figuras, cambio de destino mediante el extremo y deshacer esa reconexión.
- Arrastre desde un punto de conexión y flecha doble vertical unida automáticamente a ambas figuras; el color modifica el trazo y sus puntas.
- Elipse rotada, triángulo, eliminación del origen, dirección vertical exacta y exportación de flechas gruesas sin recortes.
- Se conservan las regresiones de edición directa, archivos, portapapeles, fondos, accesibilidad de controles, tema, funcionamiento offline y rendimiento.

Después de la suite completa se amplió la comprobación de contraste a los botones de la cabecera y se corrigió el margen de exportación de flechas gruesas. Se repiten los cuatro casos de barras/conectores/zoom y el caso del portapapeles Microsoft sobre la compilación final. El resultado se conserva en `evidence/compact-v0.4.1-final-targeted.json`.

## Evidencia visual y límites

Capturas propias en `compact-v0.4.1-desktop.png`, `compact-v0.4.1-anchors.png`, `compact-v0.4.1-colors.png`, `compact-v0.4.1-820.png` y `compact-v0.4.1-360.png`; exportación raster en `compact-v0.4.1-export.png`. `compact-v0.4.1-visual.json` registra medidas reales y la comparación aproximada con las capturas aportadas, que no se redistribuyen.

La revisión automatizada usa Chromium en este ejecutor, aunque su user-agent indique Windows. No verifica un stylus ni un dispositivo táctil físico. El bundle principal conserva el aviso de Vite por superar 500 kB minificados. Los resultados v0.4.0 se conservan como evidencia histórica; la confirmación manual nueva se documenta en WHITEBOARD_CLIPBOARD.md.
