# Archivos de Whiteboard Bridge

## Decisión: `.wbridge` como formato editable principal

Un archivo `.wbridge` es un documento **JSON UTF-8**, sin compresión ni dependencias adicionales, validado con el esquema `whiteboard-bridge` versión 2. La extensión identifica que es una pizarra de esta aplicación. No es un formato de Microsoft.

No se crea un contenedor ZIP: las imágenes ya se incorporan como data URL raster, por lo que un único archivo transporta todos los recursos de la pizarra. El JSON permite inspección, mantenimiento y migraciones futuras sin claves, backend ni bibliotecas de descompresión.

| Propiedad | Definición |
| --- | --- |
| Extensión principal | `.wbridge` |
| MIME al exportar | `application/vnd.whiteboard-bridge+json` (identificador propio de la aplicación) |
| Codificación | JSON en UTF-8, sin ejecución de contenido |
| Identificador | `schema: "whiteboard-bridge"` |
| Versión del documento | `version: 2`, independiente de la versión de la aplicación |
| Tamaño máximo | 32 MiB por archivo |
| Recursos | Objetos estructurados e imágenes raster embebidas |

## Contenido y fidelidad

El documento guarda nombre, identificador, fechas, viewport (traslación/zoom) y objetos. Cada objeto conserva tipo, identidad, coordenadas, dimensiones, rotación, estilo, opacidad, orden y bloqueo. Según el tipo también conserva texto y alineación, puntos de tinta con presión, referencias de conectores, hijos de grupos o imagen y descripción.

No contiene el historial undo/redo, preferencias personales, observaciones del laboratorio ni todas las revisiones de IndexedDB. Para un respaldo de varias pizarras se mantiene el flujo específico **Tus pizarras → Respaldar todas / Restaurar respaldo**.

Los grupos y conectores se validan por referencias. Las imágenes permanecen como imágenes editables en posición/tamaño; sus píxeles no se convierten automáticamente en notas, texto o figuras. Los documentos originales se conservan; importar crea otro identificador de pizarra.

## Importación

Pulsar **Importar** en la barra superior, usar Ctrl+O o arrastrar un archivo al lienzo:

| Archivo | Resultado |
| --- | --- |
| `.wbridge` | Se valida y abre una nueva pizarra editable |
| `.json` de Bridge v2 | El mismo documento editable que en versiones anteriores |
| `.json` del laboratorio v1 | Migración automática a v2 y apertura como nueva pizarra |
| PNG / JPEG / WebP / GIF | Se añade una imagen a la pizarra actual; GIF se normaliza a un fotograma |
| JSON de respaldo de varias pizarras | Se indica el flujo de restauración desde Tus pizarras |
| `.whiteboard`, SVG, PDF, otros JSON o formatos | Se rechazan con un mensaje; la pizarra actual se conserva |

La lectura admite BOM UTF-8 en JSON. Se reconoce la extensión sin distinguir mayúsculas y minúsculas. El MIME del sistema no es suficiente para validar el documento. Antes de modificar la sesión se comprueban el esquema, versión y límites; los archivos corruptos, ciclos, referencias rotas e imágenes raster con firma incompatible se rechazan.

Imágenes: hasta 5 MB y 16 megapíxeles, normalizadas a PNG local. Importar no requiere conexión. Si falla la persistencia, se informa y no se reemplaza la pizarra activa.

## Exportación

**Exportar → Pizarra editable · WBRIDGE** o Ctrl+S descarga el documento completo. El nombre se deriva del título, sin caracteres no portables ni nombres reservados de Windows.

**Exportar → Selección editable · WBRIDGE** descarga solo los objetos seleccionados. Seleccionar un grupo incluye sus descendientes. Seleccionar solo un miembro lo separa del grupo externo en el archivo exportado. Si un conector apunta a un objeto fuera de la selección, se eliminan esas referencias y se conserva su representación geométrica. La pizarra original no se modifica.

Se conservan **JSON** como alternativa editable compatible con versiones anteriores, **PNG** como imagen visual y **SVG** como vector visual. El SVG exportado no dispone de un importador de documentos Bridge en esta versión. Los botones de exportación del gestor de proyectos también descargan `.wbridge`.

## Ejemplo distribuido

`public/examples/primer-proyecto.wbridge` es un documento válido con objetos separados. Puede descargarse desde **Exportar → Formatos y ayuda**. Se incluye en la compilación y el precache de la PWA.

## Microsoft Whiteboard

`.wbridge` no se presenta como un archivo `.whiteboard`. Cambiar su extensión no crea compatibilidad. Esta actualización define la importación/exportación del editor Bridge; la transferencia nativa a Microsoft sigue bajo el protocolo de investigación documentado en CLIPBOARD_RESEARCH.md.

## Fondo y figuras en v0.4.0

El esquema 2 admite `background: { color: "#ffffff", grid: "dot" }`. Si falta, la lectura asigna ese fondo por defecto. Las cuadrículas son `solid`, `dot`, `square`, `graph`, `hybrid`, `diamond`, `wide-rule`, `triangle` y `narrow-rule`. Se añaden `pentagon`, `parallelogram`, `arrow-shape` y `capsule` a las figuras existentes. Los documentos con esas figuras necesitan Bridge 0.4.0 o posterior. No cambia el nombre de IndexedDB ni se elimina ninguna pizarra guardada. El fondo se conserva en el proyecto editable; los exports visuales siguen renderizando los objetos.
