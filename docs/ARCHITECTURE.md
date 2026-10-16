# Arquitectura

## Límites de los módulos

| Módulo | Responsabilidad |
| --- | --- |
| `src/models/projectFile.ts` | Contrato `.wbridge`, validación de archivos, selección portable y clasificación de importación |
| `src/models/document.ts` | Unión discriminada TypeScript, Zod, límites, referencias, migración v1→v2 |
| `src/editor/store.ts` | Estado Zustand, transacciones de historial, grupos, transformaciones y capas |
| `src/editor/geometry.ts` | Coordenadas, zoom, límites rotados, conectores e índice espacial |
| `src/editor/Canvas.tsx` | SVG, Pointer Events, selección, gestos y edición directa |
| `src/graphics/render.ts` | Primitivas seguras compartidas por pantalla, SVG y PNG |
| `src/clipboard/` | Adaptadores de texto, HTML, PNG y formato propio; lectura explícita |
| `src/interoperability/` | Esquema de observaciones y requisitos para clasificar una prueba |
| `src/persistence/` | IndexedDB con Dexie, cola de escritura, versiones y respaldo |
| `src/components/` | Paneles accesibles, proyectos, laboratorio y diálogos |
| `scripts/build-sw.mjs` | Precache del paquete estático con hash de contenido |

El documento no depende de Microsoft. El descriptor `WhiteboardNativeAdapter` no tiene encoder y está desactivado: expresa la capacidad pendiente y sus criterios, sin fingir una integración.

## Documento y relaciones

Versión 2 con `schema: whiteboard-bridge`. Cada objeto tiene identidad, posición, dimensiones, rotación, zIndex, opacidad, bloqueo y estilos. Los tipos añaden texto, figura, extremos de línea, puntos normalizados de tinta, raster data URL o hijos de grupo. `groupId` e hijos deben concordar; se rechazan ciclos, referencias rotas, IDs duplicados y más de 16 niveles. Los conectores apuntan a IDs de objetos y sus extremos se recalculan desde los centros.

Los grupos usan coordenadas absolutas para sus miembros; una transformación de grupo se aplica a los descendientes y se recalcula el límite agregado. Las copias renuevan IDs y remapean grupos y conectores. Las referencias que salen de una selección copiada se eliminan del payload portable. El tamaño y rotación individuales se conservan dentro del esquema.

## Coordenadas, selección e historial

`pantalla = mundo × zoom + traslación`. El viewport guarda traslación y zoom (0,05–8). El lienzo se mueve en torno al origen y no se crea una superficie SVG gigantesca. El documento admite ±10 millones de unidades; no es matemáticamente infinito. El eje Y crece hacia abajo.

Una rejilla dispersa de celdas de 500 unidades devuelve candidatos al viewport, con 120 píxeles de margen. Los objetos de más de 100 celdas usan un bucket adicional para evitar explotar el índice. Las coordenadas negativas se indexan con `floor`. La lista de capas se pagina a 100 elementos. `ObjectView` es memoizado; el índice se reconstruye al cambiar los objetos, no al desplazar la vista.

El arrastre previsualiza el estado y produce una única transacción al soltar. Cancelar el puntero revierte la transacción. Undo/redo usa snapshots inmutables y referencias compartidas, hasta 50 versiones o 8 si hay más de 5.000 objetos. Los campos de texto generan transacciones por cambio; una futura agrupación por sesión de edición puede mejorar ese historial.

Lazo: selecciona por el centro del objeto, criterio explícito. El área rectangular usa intersección de límites rotados. El borrador elimina objetos completos. Alt + clic permite seleccionar un miembro de grupo. No se modela borrado parcial de tinta.

## Elección del motor

Evaluación de diseño, no benchmark comparativo de librerías. Las cifras ejecutadas del motor seleccionado están en TESTING.md.

| Opción | Ventajas documentadas | Coste para este proyecto | Decisión |
| --- | --- | --- | --- |
| SVG nativo + React | Primitivas inspeccionables; exportación vectorial y semántica DOM; sin dependencia gráfica | Requiere culling y programar gestos; la cantidad de nodos importa | Elegido; viewport, índice espacial y render común |
| Fabric.js (MIT) | Modelo Canvas con interacción, serialización y transformaciones | Segundo modelo de documento y puente de exportación/accesibilidad | Evaluado, no incluido |
| Konva/react-konva (MIT) | Scene graph Canvas y recomendaciones de caché/capas | Canvas requiere alternativa semántica; coste de capas y sincronización | Evaluado, no incluido |
| perfect-freehand (MIT) | Contornos suaves a partir de puntos con presión | Resuelve tinta, no documentos, selección o clipboard | Evaluado; se conserva motor simple de segmentos con presión |

Fuentes primarias: [Fabric](https://www.fabricjs.com/), [Konva y rendimiento](https://konvajs.org/docs/performance/All_Performance_Tips.html), [perfect-freehand](https://github.com/steveruizok/perfect-freehand). Las licencias se deben comprobar de nuevo antes de incorporar sus versiones al proyecto.

No se incluye WASM, Worker ni OffscreenCanvas: la tinta actual no justifica otra frontera de mensajes. PNG se rasteriza mediante Canvas 2D local; la geometría es SVG. Para escenas densas con miles de objetos visibles se debe medir y evaluar un backend Canvas, manteniendo el mismo documento.

## Persistencia, PWA y conflictos

Dexie almacena documentos completos, revisiones y ajustes. Validación antes de escribir; una cola evita invertir el orden de escrituras. Los respaldos se validan completos antes de una transacción y se restauran con IDs nuevos. La recuperación abre una copia de una versión anterior.

BroadcastChannel detecta cambios de otra pestaña y pausa autoguardado hasta que se exporten cambios o se cargue el documento guardado. Es detección básica, sin merge colaborativo ni garantía de exclusión mutua ante escrituras exactamente simultáneas. No hay CRDT ni colaboración remota.

El SW cachea archivos locales con un nombre derivado de su contenido. No usa CDN. La instalación nueva no activa automáticamente una actualización sobre sesiones abiertas; la UI ofrece guardar y actualizar. La caché se limita al prefijo propio. No se persisten contenidos del portapapeles en ella.
