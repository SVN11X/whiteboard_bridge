# Entrega · Whiteboard Bridge v0.4.0

Base real: `SVN11X/whiteboard_bridge`, commit `90b35df409d9fe86895dca908f7dc00dfe1a46d0` de `main`. Trabajo local en `feature/whiteboard-workspace`; no se ha hecho push ni un despliegue remoto de esta actualización.

## Cambios visibles

- Cabecera de 52 px, lienzo completo, barra flotante inferior, paletas de notas, reacciones, tinta y figuras y zoom a la derecha. Se usaron las ocho capturas adjuntas como referencia; no se distribuyen esas capturas en el repositorio.
- Panel de propiedades opcional. Un clic escribe directamente en una nota, texto o figura; arrastrar mueve. Enter/F2 abre edición, Ctrl+Enter termina, Escape cancela. Undo agrupa la escritura por sesión.
- Pizarras nuevas vacías y conservación de documentos existentes. Fondos por documento con diez colores y nueve cuadrículas, con un valor por defecto al abrir archivos anteriores.
- Plantillas con objetos editables, reacciones, comentarios locales, enlaces y temporizador. Compartir entrega copias WBRIDGE o PNG, sin aparentar una sesión colaborativa.

## Portapapeles

La versión anterior no implementaba la representación específica de Microsoft. Se añadió un encoder experimental del contenedor HTML observado para notas, texto y siete figuras. Se reconoce el mismo contenedor al pegar en Bridge. No se añade PNG a ese modo ni se convierte silenciosamente un tipo incompatible.

El payload combina un ejemplo histórico de clipboard con propiedades de objetos observadas en convertidores actuales del cliente público. Su aceptación por el importador de Microsoft sigue siendo una hipótesis. No se certifica interoperabilidad nativa a partir de un round-trip de nuestro codec.

El navegador de Microsoft llegó al inicio de sesión, sin una sesión autenticada disponible. No se ejecutó Bridge → Whiteboard real. Para continuar se implementó una captura voluntaria: Configuración → Diagnóstico de portapapeles → Capturar muestra Whiteboard → pegar una nota sintética del original → Descargar muestra JSON. Ver WHITEBOARD_CLIPBOARD.md.

## Comprobación

TypeScript, ESLint, 35 pruebas unitarias/integración y compilación con comprobación de la ruta `/whiteboard_bridge/`. La suite de navegador incluye los flujos anteriores y ocho casos nuevos de edición directa, layout, fondos, portapapeles y captura. El resultado final y los archivos de evidencia se registran en TESTING.md.

Se revisaron capturas propias de escritorio y 360 px. Los recursos de Microsoft se inspeccionaron solo como fuentes públicas; no se incorporan ni se descargan al ejecutar la aplicación.

## Entrega

ZIP completo con el código y `dist/`. Parche `WHITEBOARD_WORKSPACE_V0.4.0.patch` generado desde la base indicada, aplicable con `git am --3way` y verificado en una copia limpia mediante comparación del árbol Git. El archivo RELEASE.json del ZIP contiene commits, árbol y estado de validación.
