> Actualización v0.4.0: se implementó un codec experimental del contenedor HTML observado y captura voluntaria de muestras. El detalle actual está en [WHITEBOARD_CLIPBOARD.md](WHITEBOARD_CLIPBOARD.md). La investigación siguiente conserva la distinción entre capacidad web y aceptación nativa, que continúa pendiente de verificación autenticada.

# Investigación del portapapeles y Whiteboard

Consulta de fuentes primarias: **16 de octubre de 2026**. Las capacidades de Microsoft y los navegadores pueden cambiar. Se separan documentación oficial, inferencias y pruebas ejecutadas.

## Microsoft Whiteboard

La página oficial específica de retirada confirma el **16 de octubre de 2026** para las aplicaciones independientes de Windows/iOS/Android. Para cuentas de trabajo o educativas mantiene acceso a pizarras OneDrive desde Web/Teams. No debe extrapolarse a una disponibilidad idéntica para cuentas personales. Algunas páginas de migración consultadas mostraban fechas anteriores distintas; para retirada se priorizó el artículo específico, sin convertir esos textos contradictorios en un resultado experimental.

Microsoft documenta objetos como textos, notas, figuras, imágenes, documentos y otros recursos, con menú contextual para editar propiedades, copiar y ordenar. Los atajos documentan Ctrl+C y Ctrl+V. Es información sobre el producto: **no demuestra** que una aplicación externa pueda fabricar su representación nativa de clipboard. La copia entre pizarras requiere una línea base real, incluso si la copia en la misma pizarra funciona.

Los archivos `.whiteboard` respaldados en OneDrive existen. La duplicación oficial para cuentas comerciales copia el archivo en OneDrive. No se obtuvo un esquema público de serialización de objetos que permita construirlos desde Bridge. Cambiar la extensión de un JSON no lo convierte en uno de esos archivos.

**Graph sí tiene exportación/conversión documentada:** `GET .../content?format=html` y `format=pdf` admiten `whiteboard` como extensión fuente. Requiere autorización y permisos sobre archivos; el contenido convertido se descarga mediante una redirección temporal. También existe `Export-WhiteboardHtml`. Estas rutas describen lectura/conversión de archivos existentes; no documentan una operación para insertar una nota o generar su clipboard nativo. La conclusión de que no bastan para el objetivo de escritura es una inferencia sobre el contrato publicado, no una prueba de inexistencia absoluta de cualquier API.

No se ejecutaron pruebas autenticadas en Web/Teams, cuentas personales/educativas/profesionales ni navegadores Edge/Chrome de Windows. Las políticas del tenant, permisos de OneDrive, licencias y restricciones corporativas pueden modificar la disponibilidad.

## Qué expone una página estática

| Mecanismo | Posible desde JS en HTTPS | Límite relevante |
| --- | --- | --- |
| `navigator.clipboard.write` + `ClipboardItem` | Escribir representaciones admitidas en una interacción de usuario | Soporte, permisos, activación y políticas; el destino elige formato |
| `navigator.clipboard.read` | Enumerar MIME expuestos y obtener blobs con permiso | No enumera necesariamente todos los formatos nativos del sistema |
| `text/plain` | Copia de texto | Pierde tipos, geometría y estilos |
| `text/html` | HTML generado y saneado por Bridge | El navegador puede sanearlo otra vez; Whiteboard decide cómo importarlo |
| `image/png` | Copia raster local | Una imagen plana no conserva notas, figuras o grupos nativos |
| `web application/...` | Formatos propios cuando Chromium los soporta | Namespace web; requiere un lector que lo reconozca expresamente |
| `ClipboardEvent.clipboardData` / `DataTransfer` | Lectura de un pegado iniciado por el usuario | Los tipos se limitan al evento; un evento sintético no concede acceso al clipboard real |
| Win32/COM | No disponible directamente desde JS web | Requeriría un componente adicional; no se exige para el editor |

Clipboard APIs requieren contexto seguro y restricciones específicas del navegador. Los permisos pueden ser denegados; la UI muestra errores y ofrece JSON. La implementación construye `ClipboardItem` con promesas de PNG durante el gesto de usuario, para no esperar la rasterización antes de solicitar escritura. No hay lectura en segundo plano.

Chrome documenta formatos web personalizados desde Chromium 104. El prefijo `web ` distingue el formato para interoperabilidad web; no equivale automáticamente a registrar el formato propietario que consume otra app. Edge comparte la base Chromium, pero se deben comprobar soporte y políticas por característica en ejecución. No se afirma paridad exacta por versión.

El HTML de Bridge contiene texto escapado y estilos cerrados, saneados con DOMPurify. El pegado de HTML externo no se ejecuta: se usa texto plano, imagen raster o el formato propio validado. No se pide lectura HTML sin sanitizar. Escribir PNG no revela si el receptor lo usó: la API no informa el formato elegido por otra aplicación; se registra por observación manual.

## Puerta de validación nativa

1. Establecer Whiteboard→misma pizarra y →otra pizarra con un objeto sintético.
2. Comparar metadatos expuestos al navegador; opcionalmente comparar Win32 con el script recibido.
3. Si aparece un formato legítimo y portable, documentar su procedencia, estructura y versión sin credenciales ni referencias privadas.
4. Generar un único objeto mínimo y demostrar en Whiteboard que ofrece sus controles nativos, propiedades editables y objetos separados.
5. Repetir en dos sesiones y navegadores soportados, con evidencia local anonimizada.
6. Solo entonces certificar como compatibles el encoder y los fixtures de los tipos demostrados. Un resultado manual no habilita un adaptador por sí solo.

Si solo se exponen PNG o texto, la página no puede deducir la estructura faltante con certeza. Si la transferencia contiene referencias de servidor o requiere endpoints privados, Bridge no tiene autorización ni capacidad web para sustituir ese contrato. No es válido saltarse autenticación, políticas o restricciones de origen.

**Alternativas viables:** mantener el proyecto editable de Bridge, pegar texto y recrear figuras con las herramientas oficiales, usar exportación visual si satisface la tarea o desarrollar una integración futura basada en un contrato público. Automatizar manualmente la UI oficial sería otro flujo, frágil y separado del clipboard; no se implementó ni se presenta como solución al pegado nativo.

## Fuentes

1. [Microsoft: retirada de apps independientes](https://support.microsoft.com/en-us/whiteboard/retirement-standalone-microsoft-whiteboard-apps).
2. [Microsoft: menú contextual](https://support.microsoft.com/en-us/whiteboard/whiteboard-context-menu).
3. [Microsoft: atajos](https://support.microsoft.com/en-us/whiteboard/whiteboard-keyboard-shortcuts).
4. [Microsoft: duplicación](https://support.microsoft.com/en-gb/whiteboard/duplicate-whiteboards).
5. [Microsoft: migración Azure–OneDrive](https://support.microsoft.com/en-us/whiteboard/migration-of-whiteboards-from-azure-to-onedrive).
6. [Graph: conversión de contenido](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format?view=graph-rest-1.0).
7. [PowerShell: Export-WhiteboardHtml](https://learn.microsoft.com/en-us/powershell/module/whiteboardadmin/export-whiteboardhtml?view=whiteboard-ps).
8. [W3C: Clipboard API and events](https://www.w3.org/TR/clipboard-apis/).
9. [Chrome: web custom formats](https://developer.chrome.com/blog/web-custom-formats-for-the-async-clipboard-api).
10. [Win32: Clipboard](https://learn.microsoft.com/en-us/windows/win32/dataxchg/clipboard), [GetClipboardData](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getclipboarddata).

Ninguna fuente de esta lista constituye evidencia de Bridge→Whiteboard nativo. Ver INTEROPERABILITY_MATRIX.md para el estado de ejecución.
