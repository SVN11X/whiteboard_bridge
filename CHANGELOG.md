# Cambios

## 0.3.1 · 2026-10-16

- Ruta de GitHub Pages corregida a `/whiteboard_bridge/`, igual que el repositorio real.
- Service worker, enlaces y pruebas de navegador ajustados al mismo subdirectorio.
- La compilación comprueba las rutas y los recursos generados contra `GITHUB_REPOSITORY` para evitar desplegar una página con archivos inexistentes.
- Instrucciones de actualización sobre el repositorio existente, con parche desde su commit `131d014`.

## 0.3.0 · 2026-10-16

- Formato editable `.wbridge`, con especificación JSON versionada y recursos embebidos.
- Botón Importar, Ctrl+O y arrastrar proyectos o imágenes al lienzo.
- Exportación de pizarra completa o selección y Ctrl+S al formato principal.
- JSON de versiones anteriores y exportaciones visuales SVG/PNG conservados.
- Validación de archivos, errores visibles, comprobación de firmas raster y apertura segura como nueva pizarra.
- Guía de formatos y documento de ejemplo descargable, también offline.

## 0.2.0 · 2026-10-16

- Editor modular en React, TypeScript y Vite, compatible con la ruta de GitHub Pages.
- Modelo versionado con validación y migración del esquema del laboratorio anterior.
- Herramientas, grupos, conectores, transformaciones, historial y controles accesibles.
- Persistencia IndexedDB, versiones, respaldos y exportaciones JSON/SVG/PNG.
- Adaptadores de clipboard con detección, fallback y diagnóstico explícito.
- Compatibility Lab con matriz y observaciones manuales; natividad de Microsoft sin verificar.
- PWA, modo offline, workflow y pruebas unitarias, de integración, E2E y rendimiento.
- Prototipo recibido conservado y script Windows independiente.
