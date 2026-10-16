# Informe de entrega · Whiteboard Bridge v0.3.1

## Corrección de GitHub Pages

La versión 0.3.1 se prepara desde el repositorio real `SVN11X/whiteboard_bridge`, commit `131d0140853d9f98c877299b1d508a10e9749d9e`. Corrige la ruta `/whiteboard_bridge/` en Vite, el service worker y las pruebas. El despliegue anterior terminó correctamente, pero el HTML buscaba recursos en `/whiteboard-bridge/` y recibía 404.

Se añade una comprobación de compilación contra `GITHUB_REPOSITORY`: valida enlaces, archivos del manifiesto, ruta y recursos offline. Se verificó su aprobación con el nombre correcto y su rechazo con un nombre diferente. Pasaron TypeScript, ESLint, las 29 pruebas unitarias/integración y las 13 E2E sobre la ruta corregida, incluida importación/exportación y recarga offline.

El ZIP completo y `FIX_GITHUB_PAGES.patch` permiten actualizar el repositorio existente. La corrección se verifica localmente; no se ha hecho push ni un nuevo despliegue remoto. La guía está en [DEPLOYMENT.md](DEPLOYMENT.md), con evidencia HTTP en [pages-diagnosis.json](evidence/pages-diagnosis.json) y la suite actual en [pages-fix-e2e.json](evidence/pages-fix-e2e.json).

## Construido

Actualización v0.3.0: archivo editable principal `.wbridge` (JSON UTF-8, esquema v2), botón Importar y Ctrl+O, arrastrar proyectos o imágenes, exportación de pizarra completa o selección, Ctrl+S al formato principal, guía integrada y ejemplo descargable. Se conservan los JSON anteriores y las exportaciones visuales. La importación crea otra pizarra y valida el contenido antes de abrirlo.

Aplicación estática React/TypeScript/Vite con identidad visual propia, modos claro/oscuro y layout responsive. Lienzo con viewport, zoom y desplazamiento; selección individual/múltiple, área y lazo; lápiz con presión disponible, rotulador, resaltador y borrador por objeto. Texto, notas, rectángulos, elipses, triángulos, rombos, líneas, flechas simples/dobles, conectores, imágenes y grupos.

Manipulación con arrastre, resize, rotación, panel numérico, duplicación, alineación, distribución, capas, bloqueo, deshacer/rehacer, edición directa y menús contextuales. Gestión de pizarras con guardado IndexedDB, importación del esquema anterior, JSON editable, SVG/PNG visual, respaldos y recuperación como copia.

Adaptadores independientes de texto, HTML saneado, PNG y formato web propio, junto con modo combinado y reporte de fallback. Compatibility Lab registra metadatos, comparaciones por origen y observaciones con criterios; exporta matriz e informe. PWA con precache, modo offline y activación de actualización por el usuario. Workflow de GitHub Pages con validaciones.

## Probado

29 pruebas unitarias/integración y 13 E2E aprobadas, TypeScript, lint y compilación. Edición, guardado y recarga, transformación, bloqueo, agrupación, importación, PNG, copiado real entre pestañas de Bridge, MIME personalizado, carga offline, móvil y oscuro. Rendimiento medido con 100, 1.000 y 10.000 figuras simples. Ver TESTING.md y sus JSON de evidencia.

El prototipo original se conserva en `legacy/v0.1.0/`; el diagnóstico PowerShell continúa independiente en `windows/`. El código fuente completo y una compilación de `dist/` están incluidos. El parche actual `FIX_GITHUB_PAGES.patch` parte del commit remoto `131d0140853d9f98c877299b1d508a10e9749d9e`; se verifica mediante aplicación sobre una copia limpia y comparación del árbol Git.

## Experimental y pendiente

La transferencia hacia Microsoft Whiteboard Web/Teams se preparó para ejecución manual con los diez tipos obligatorios. **No se probó una cuenta real de Microsoft ni se implementó un encoder nativo.** Los estados de la matriz externa son No ejecutado. Los resultados positivos de Bridge→Bridge no se extrapolan a Microsoft.

Graph ofrece conversión de `.whiteboard` existente hacia HTML/PDF; no se comprobó que permita fabricar notas, figuras o el clipboard nativo desde una página. El descriptor `WhiteboardNativeAdapter` está desactivado y exige evidencia antes de implementar un encoder.

No se realizó publicación remota, instalación desde el diálogo PWA de Windows, validación de stylus físico, Edge real, lectores de pantalla o auditoría WCAG completa. PDF local, borrado parcial de tinta, colaboración remota y paneles reorganizables no están implementados; sus límites y prioridades están documentados.

## Restricciones demostrables

El JavaScript web solo accede a representaciones que el navegador expone y permite. No puede invocar directamente Win32/COM, forzar que Whiteboard entienda un formato propio ni acceder a sesiones de Microsoft de otra pestaña. PNG aplana el contenido. Exportar JSON no crea un archivo `.whiteboard`.

No se declara una imposibilidad universal de interoperabilidad editable: sigue faltando evidencia reproducible del contrato que acepte el destino. El procedimiento exacto para investigarlo está en CLIPBOARD_RESEARCH.md e INTEROPERABILITY_MATRIX.md.

## Para continuar

1. Aplicar la corrección en el repositorio existente y hacer push a `main`, siguiendo DEPLOYMENT.md. Pages ya está activo.
2. Abrir la web publicada y verificar recarga, IndexedDB y Clipboard en HTTPS.
3. Ejecutar primero Whiteboard→Whiteboard con objetos sintéticos.
4. Ejecutar Bridge→Whiteboard por objeto/formato y registrar menú, editabilidad, geometría, agrupación y repetición.
5. Implementar un adaptador nativo únicamente si aparece un mecanismo portable, legítimo y aceptado por el original.
