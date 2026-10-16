# Validación de v0.4.0

Fecha: 16-10-2026. Base remota `90b35df409d9fe86895dca908f7dc00dfe1a46d0`. Ejecutor Linux, Node 24.19.0 y npm 11.9.0. Dependencias exactas sin cambios en package-lock.json.

## Comandos

```powershell
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
```

El workflow instala Chromium con sus dependencias. En este entorno se utiliza el binario auxiliar local con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, igual que en las entregas anteriores. No se incluye ese binario en el ZIP. Chromium automatizado no certifica una instalación física de Edge/Chrome Windows ni un stylus.

## Resultado

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| TypeScript | Aprobado | Aplicación, configuración y pruebas |
| ESLint | Aprobado | Sin errores ni advertencias |
| Vitest | Aprobado | 35 pruebas en cuatro archivos |
| Producción y PWA | Aprobado | Base `/whiteboard_bridge/`, cuatro enlaces y nueve recursos offline verificados |
| Playwright | Aprobado | 21 pruebas sin reintentos ni fallos, 37,1 s; incluye medición de escenas |
| Revisión visual | Ejecutada | Capturas sintéticas de escritorio, paneles y 360 px; se corrigen controles tapados |
| Microsoft autenticado | No ejecutado | El navegador llegó al inicio de sesión; sin evidencia de pegado nativo |
| Nuevo despliegue remoto | No ejecutado | Corrección entregada para registrar y subir |

La evidencia final de E2E se guarda en `evidence/workspace-v0.4-e2e.json`. El diagnóstico del cliente público está en `evidence/whiteboard-client-observations.json`. Las ejecuciones v0.3.0/v0.3.1 se conservan como históricas en sus JSON anteriores.

## Qué comprueban los casos nuevos

- Una primera pizarra vacía y ausencia inicial de panel lateral.
- Un clic para editar, Enter/F2, cancelación, saltos de línea, guardado y una sola transacción de undo por sesión.
- Arrastre sin apertura accidental de escritura.
- Fondo y cuadrícula que sobreviven a recarga y exportación WBRIDGE.
- Controles esenciales y paletas dentro de 360, 820 y 1440 px.
- Escritura/lectura real del contenedor HTML de datos sintéticos en el portapapeles de Chromium, sin PNG, y pegado editable dentro de Bridge.
- Selección no compatible que deja intacto el portapapeles.
- Captura de muestra sintética y descarga JSON sin insertar HTML activo.
- Plantillas, enlaces y controles del temporizador.

El round-trip sintético prueba nuestro serializador y la ruta del navegador. No ejecuta el parser de Microsoft, no prueba notas nativas en Whiteboard y no puede aprobar ese resultado. La captura de una muestra tampoco cambia automáticamente `verifiedInMicrosoft: false`.

## Problemas detectados durante la revisión

La primera adaptación dejaba el zoom detrás del panel de propiedades y la barra de acciones se superponía al tirador de rotación. Se reubicaron los controles y la barra pasa debajo de objetos cercanos al borde superior. También se restauró el engranaje de configuración en móvil, ocultado por una regla anterior.

Los fixtures de regresión ahora crean explícitamente su escena de ejemplo; el producto ya no abre ocho objetos de demostración al primer uso. Los tests acceden a exportación, importación, figuras e inspector mediante los nuevos menús.

## Límites de las mediciones

La suite mantiene escenas de 100, 1.000 y 10.000 rectángulos. Los datos brutos de esta ejecución están en [workspace-v0.4-benchmark.json](evidence/workspace-v0.4-benchmark.json). No se extrapola a 10.000 imágenes o trazos densos ni a hardware Windows. El bundle principal conserva el aviso de Vite por superar 500 kB minificados; no se modifica el umbral para ocultarlo.

Las capturas finales se incluyen en `evidence/workspace-v0.4-empty.png`, `workspace-v0.4-direct-edit.png`, `workspace-v0.4-background.png` y `workspace-v0.4-mobile.png`. La captura muestra objetos sintéticos locales, no evidencia del importador de Microsoft.

Tras la suite completa se movió el aviso de estado a la parte superior en pantallas estrechas para no cubrir los colores. Se repitió el caso de layout en 360, 820 y 1440 px, incluyendo una comprobación de que aviso y paleta no se superponen: aprobado. Evidencia en `evidence/workspace-v0.4-layout-final.json`. No hubo cambios funcionales posteriores.
