# Informe de entrega · Whiteboard Bridge v0.3.0

## Construido

Actualización v0.3.0: archivo editable principal `.wbridge` (JSON UTF-8, esquema v2), botón Importar y Ctrl+O, arrastrar proyectos o imágenes, exportación de pizarra completa o selección, Ctrl+S al formato principal, guía integrada y ejemplo descargable. Se conservan los JSON anteriores y las exportaciones visuales. La importación crea otra pizarra y valida el contenido antes de abrirlo.

Aplicación estática React/TypeScript/Vite con identidad visual propia, modos claro/oscuro y layout responsive. Lienzo con viewport, zoom y desplazamiento; selección individual/múltiple, área y lazo; lápiz con presión disponible, rotulador, resaltador y borrador por objeto. Texto, notas, rectángulos, elipses, triángulos, rombos, líneas, flechas simples/dobles, conectores, imágenes y grupos.

Manipulación con arrastre, resize, rotación, panel numérico, duplicación, alineación, distribución, capas, bloqueo, deshacer/rehacer, edición directa y menús contextuales. Gestión de pizarras con guardado IndexedDB, importación del esquema anterior, JSON editable, SVG/PNG visual, respaldos y recuperación como copia.

Adaptadores independientes de texto, HTML saneado, PNG y formato web propio, junto con modo combinado y reporte de fallback. Compatibility Lab registra metadatos, comparaciones por origen y observaciones con criterios; exporta matriz e informe. PWA con precache, modo offline y activación de actualización por el usuario. Workflow de GitHub Pages con validaciones.

## Probado

29 pruebas unitarias/integración y 13 E2E aprobadas, TypeScript, lint y compilación. Edición, guardado y recarga, transformación, bloqueo, agrupación, importación, PNG, copiado real entre pestañas de Bridge, MIME personalizado, carga offline, móvil y oscuro. Rendimiento medido con 100, 1.000 y 10.000 figuras simples. Ver TESTING.md y sus JSON de evidencia.

El prototipo original se conserva en `legacy/v0.1.0/`; el diagnóstico PowerShell continúa independiente en `windows/`. El código fuente completo y una compilación de `dist/` están incluidos. El parche `UPGRADE_FROM_V0.2.0.patch` parte de la entrega anterior, commit `b64602d6b89e455a81532f20949bac793b4d4dd8`, y se verifica mediante aplicación sobre una copia limpia y comparación del árbol Git. No presupone un commit remoto.

## Experimental y pendiente

La transferencia hacia Microsoft Whiteboard Web/Teams se preparó para ejecución manual con los diez tipos obligatorios. **No se probó una cuenta real de Microsoft ni se implementó un encoder nativo.** Los estados de la matriz externa son No ejecutado. Los resultados positivos de Bridge→Bridge no se extrapolan a Microsoft.

Graph ofrece conversión de `.whiteboard` existente hacia HTML/PDF; no se comprobó que permita fabricar notas, figuras o el clipboard nativo desde una página. El descriptor `WhiteboardNativeAdapter` está desactivado y exige evidencia antes de implementar un encoder.

No se realizó publicación remota, instalación desde el diálogo PWA de Windows, validación de stylus físico, Edge real, lectores de pantalla o auditoría WCAG completa. PDF local, borrado parcial de tinta, colaboración remota y paneles reorganizables no están implementados; sus límites y prioridades están documentados.

## Restricciones demostrables

El JavaScript web solo accede a representaciones que el navegador expone y permite. No puede invocar directamente Win32/COM, forzar que Whiteboard entienda un formato propio ni acceder a sesiones de Microsoft de otra pestaña. PNG aplana el contenido. Exportar JSON no crea un archivo `.whiteboard`.

No se declara una imposibilidad universal de interoperabilidad editable: sigue faltando evidencia reproducible del contrato que acepte el destino. El procedimiento exacto para investigarlo está en CLIPBOARD_RESEARCH.md e INTEROPERABILITY_MATRIX.md.

## Para continuar

1. Subir el proyecto al repositorio previsto y activar Pages con GitHub Actions, siguiendo DEPLOYMENT.md.
2. Abrir la web publicada y verificar recarga, IndexedDB y Clipboard en HTTPS.
3. Ejecutar primero Whiteboard→Whiteboard con objetos sintéticos.
4. Ejecutar Bridge→Whiteboard por objeto/formato y registrar menú, editabilidad, geometría, agrupación y repetición.
5. Implementar un adaptador nativo únicamente si aparece un mecanismo portable, legítimo y aceptado por el original.
