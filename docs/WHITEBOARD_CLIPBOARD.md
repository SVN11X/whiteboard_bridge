# Portapapeles de Microsoft Whiteboard · estado de v0.4.1

## Antecedente de v0.3.1

El usuario probó los cinco modos de v0.3.1 y solo consiguió pegar una imagen en Microsoft Whiteboard. No consiguió notas o figuras nativas editables. Esto es un resultado negativo de interoperabilidad, no un problema que se pueda resolver cambiando el nombre del MIME propio de Bridge.

`application/x-whiteboard-bridge+json` es un formato de esta aplicación. El HTML anterior solo describía bloques con texto y colores; no enviaba la estructura de los objetos de Microsoft. PNG sigue siendo una imagen única.

## Evidencia recuperada

Se revisó una investigación primaria y recursos públicos del cliente Microsoft del 16-10-2026:

| Fuente | Qué se observó | Qué no demuestra |
| --- | --- | --- |
| [Investigación original de 2024](https://spaceraccoon.dev/clipboard-microsoft-whiteboard-excalidraw-meta/) | Un contenedor `whiteboard-tag`, atributo `whiteboardcontent`, JSON codificado como URI y un ejemplo histórico con `boardItems` | Vigencia completa de ese payload en 2026 |
| [Cliente público, build 26.10910.104](https://whiteboard.cloud.microsoft/whiteboard-app/scripts/app.v26.10910.104.js) | Referencias a recursos del editor; se inspeccionaron sin autenticación | No es un SDK ni una API estable |
| [Módulo de portapapeles](https://whiteboard.cloud.microsoft/blueboard/chunks/36418.f2faa5d872fca7f84a28.js) | El cliente reconoce ese contenedor HTML, decodifica JSON y lo entrega internamente como `text/whiteboard` | No certifica que cualquier JSON con ese contenedor sea aceptado |
| [Enumeraciones del cliente](https://whiteboard.cloud.microsoft/blueboard/chunks/30148.e70ec5c510df3f64f9b0.js) | Identificadores de figuras, incluida elipse 34, rectángulo 4 y píldora 138 | No certifica la conversión de una selección completa |
| [Conversión de objetos](https://whiteboard.cloud.microsoft/blueboard/chunks/36893.60aa455776fc10a27841.js) y [paleta de notas](https://whiteboard.cloud.microsoft/blueboard/chunks/64790.c2ca9f55f998da113b7b.js) | Propiedades de notas, texto y figuras, y los doce colores de notas | Los convertidores de plantillas no constituyen un contrato público de clipboard |

Las URL y hashes de los recursos relevantes se registran en `evidence/whiteboard-client-observations.json`. No se redistribuyen esos programas ni se cargan al ejecutar Bridge. El encoder es una implementación propia de intercambio de datos.

## Implementación y límite concreto

La opción **Microsoft Whiteboard · editable** produce HTML con ese contenedor y objetos separados. El usuario confirmó el 16-10-2026 «Funciono el pegado» después de probar v0.4.0. En v0.4.1 se conserva el payload y se retiran la etiqueta y el aviso experimental. La confirmación no desglosa objetos, navegadores o sesiones; no se inventan esas observaciones.

| Objeto de Bridge | Envío a Microsoft |
| --- | --- |
| Nota | Texto, tamaño, rotación y color aproximado a la paleta de Microsoft |
| Texto | Texto plano, color, alineación, tamaño y posición |
| Rectángulo, elipse, triángulo, rombo, pentágono, paralelogramo y píldora (`capsule`) | Figura con código de tipo, relleno, borde, tamaño, texto y posición. La flecha sólida (`arrow-shape`) no está incluida |
| Grupo | Se envían sus miembros compatibles por separado; se informa la pérdida de agrupación |
| Imagen, tinta, línea, conector o flecha sólida | Se rechaza la copia completa a Microsoft con un mensaje; el usuario puede elegir PNG o el formato propio de Bridge |

El modo Microsoft no incluye PNG ni cambia silenciosamente a imagen. Si se rechaza únicamente el formato adicional de Bridge, el reintento conserva el mismo HTML destinado a Microsoft. Un error por objetos no admitidos ocurre antes de escribir el portapapeles.

También se reconoce ese HTML al pegar en Bridge, validando y convirtiendo solo los tres tipos admitidos. Un payload futuro, un objeto activo o una figura desconocida se rechaza; no se monta su HTML ni se interpreta un iframe. Esta conversión es una prueba de nuestro codec, no una ejecución del importador de Microsoft.

## Estado de verificación

El descriptor registra `status: 'user-confirmed'` y `verification.method: 'user-report'`, con fecha 16-10-2026. El reporte del usuario es la evidencia externa disponible. Se conserva el alcance real: notas, texto y siete figuras en el encoder; tinta, imágenes y conectores no se añaden a ese formato.

Las pruebas automatizadas comprueban la escritura y lectura reales en el portapapeles de Chromium, la estructura codificada y el pegado editable dentro de Bridge. No son una sesión automatizada de Microsoft; el descriptor lo expresa con `verification.automatedMicrosoftTest: false`. El navegador de la revisión anterior llegó al inicio de sesión. No se requieren nuevas capturas para usar el formato confirmado.

## Captura opcional para ampliar la compatibilidad

1. Publicar esta actualización y abrir **Configuración → Diagnóstico de portapapeles → Capturar muestra Whiteboard**.
2. En el Whiteboard original, crear una nota sintética con «Prueba de edición». Salir de la edición del texto, seleccionar la nota completa y copiarla.
3. Volver al recuadro de captura de Bridge y pulsar Ctrl+V. Elegir **Descargar muestra JSON**.
4. Repetir con una elipse y un rectángulo. Las muestras permiten contrastar las estructuras de cada tipo y corregir diferencias de versión, geometría o serialización.

La muestra contiene el HTML y los datos copiados. Solo se lee por una acción explícita, se mantiene en memoria en esa pestaña y se descarga bajo petición. Usar objetos de prueba; no se necesita una consola, un token o una contraseña. No se envía al servidor automáticamente.

Para ampliar una matriz reproducible por tipo y navegador pueden verificarse texto y color editables con los controles de Microsoft, objetos separados, relaciones y geometría, y repetición en dos sesiones. Un pegado como imagen o texto suelto no equivale a aprobar una nota nativa.
