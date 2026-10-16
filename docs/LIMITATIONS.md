# Límites conocidos

## No validado externamente

- Matriz completa Bridge→Microsoft por objeto, navegador y cuenta. El usuario confirmó que funcionó el pegado de v0.4.0; no detalló todos esos casos. Tinta, imágenes y conectores no se serializan en el modo Microsoft; los grupos compatibles se separan. Ver WHITEBOARD_CLIPBOARD.md.
- Acceso o paridad de funciones entre cuentas personales, trabajo y educación; Web frente a Teams; Edge y Chrome en Windows.
- Ejecución de GitHub Actions y publicación remota. La ruta equivalente y el paquete compilado se prueban localmente.
- Inspector PowerShell en Windows: conservado y revisado, no ejecutado en Linux.
- Instalación PWA mediante el diálogo de Edge/Chrome y comportamiento de actualizaciones con múltiples perfiles reales.
- Presión de un lápiz físico, multitáctil en hardware, lectores de pantalla y auditoría completa WCAG 2.2 AA.

## Funcionalidad implementada con límites explícitos

- Plano navegable de coordenadas finitas ±10 millones; zoom 5–500 %. No se usa una superficie SVG de dimensiones fijas como sustituto del viewport.
- Borrador por objeto completo; no borra segmentos de un trazo.
- Lazo selecciona por centros; no calcula intersección exacta de polígonos con contornos de tinta.
- Tinta de segmentos con grosor según presión; no hay estabilizador, reconocimiento de formas o contornos perfect-freehand.
- El tema oscuro cambia paneles y diálogos; las barras conservan sus colores configurables, blancos por defecto; el papel del lienzo se mantiene claro para que los colores reales del documento y sus exportaciones sigan siendo legibles.
- Textos planos con estilos por objeto. No hay texto enriquecido por palabra ni tipografía descargada. El ajuste de líneas es aproximado según tamaño de fuente; puede diferir entre sistemas.
- Redimensionar selección usa sus límites alineados a ejes. Los grupos conservan miembros, y su rotación se aplica a cada descendiente. No existe un marco local independiente para grupos.
- Conectores rectos anclados al contorno, con puntos de conexión y extremos que se pueden volver a unir. No evitan obstáculos ni calculan rutas alrededor de figuras superpuestas.
- Las imágenes se normalizan y GIF queda como un fotograma; no se admite SVG importado ni URLs remotas.
- PDF no implementado: se prioriza una exportación local verificable SVG/PNG sobre una conversión parcial no comprobada. El usuario puede usar las herramientas de impresión del navegador, sin promesa de PDF multipágina exacto.
- Límites JSON y geometría documentados en SECURITY.md. PNG puede rechazar selecciones demasiado extensas; SVG permite conservar su representación vectorial.
- La medición de rendimiento usa figuras simples distribuidas con culling. No acredita 10.000 imágenes o trazos densos visibles simultáneamente. El índice se reconstruye al modificar objetos.
- IndexedDB depende del origen/perfil del navegador. El guardado diferido puede perder los cambios más recientes ante cierre forzoso antes de guardar. Descargas JSON y respaldos son copias independientes.
- Cinco revisiones espaciadas al menos 15 segundos; no equivalen al historial completo. El historial undo/redo no persiste entre recargas.
- BroadcastChannel ofrece aviso de cambios de otra pestaña, sin merge ni exclusión mutua absoluta. No hay colaboración remota, sincronización entre dispositivos o recuperación si se borra el perfil.
- No hay paneles arrastrables o reorganizables; en móvil el inspector se oculta/abre. Los iconos disponen de etiquetas y el panel numérico evita depender del arrastre, sin declarar certificación de accesibilidad.

## Restricciones comprobables frente a hipótesis

El namespace web personalizado requiere que el receptor lo admita; no obliga a Microsoft a hacerlo. La web no tiene acceso directo a Win32/COM ni a las sesiones de otra pestaña. Graph documenta conversiones de archivos existentes, sin demostrar una ruta de fabricación de objetos para este flujo. Esas restricciones explican por qué no se ofrece el botón «Nativo validado».

No se sostiene que todo intercambio editable sea imposible en cualquier escenario. Lo que falta es evidencia suficiente y un contrato reproducible para implementarlo legítimamente.

## Entorno de v0.4.1

La disposición se adapta a las capturas, pero no se replica el servicio de Microsoft: Compartir entrega un archivo, los comentarios son locales y no se incluyen cuentas, coautoría ni Loop. Los enlaces y videos se añaden como enlaces editables que se pueden abrir; no se incrustan iframes. Las cuadrículas se conservan en WBRIDGE; las exportaciones SVG/PNG continúan representando objetos sobre su fondo de exportación.
