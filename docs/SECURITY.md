# Seguridad y privacidad

## Modelo de confianza

El navegador es el almacén y el entorno de ejecución. Los proyectos importados, imágenes y clipboard se consideran entradas no confiables. La aplicación no se conecta a Microsoft ni usa tokens, APIs privadas, cuentas o telemetría. El hosting recibe las solicitudes normales de archivos estáticos; no recibe el contenido de la pizarra desde la app.

El usuario inicia cada lectura del clipboard mediante botón o Ctrl+V. La inspección solo recoge MIME/tamaño/error. Capturas de metadatos se mantienen en sesión; las observaciones se guardan localmente y pueden exportarse. Las notas de laboratorio escritas por el usuario sí se incluyen en ese informe.

## Controles implementados

- Importación `.wbridge`/JSON: extensión reconocida y contenido validado; las imágenes se comprueban por firma raster, tamaño y decodificación antes de incorporarlas. No se ejecutan los archivos importados.
- Zod: datos finitos, colores hexadecimales, discriminantes y referencias. Se rechazan versiones futuras y relaciones cíclicas.
- 32 MiB por JSON; 20.000 objetos; 20.000 caracteres por texto; 500.000 puntos de tinta agregados; 16 niveles de grupos; 24 MB de data URLs de imágenes agregadas.
- Importador de imágenes: PNG/JPEG/WebP/GIF de hasta 5 MB y 16 megapíxeles; normalización local a PNG; metadatos y animación no se conservan. Data URL individual validada con máximo 8 MB de texto.
- Exportación PNG limitada a 16 megapíxeles y 8192 px por lado. SVG permanece vectorial y no se confunde con un formato de Microsoft.
- No se aceptan archivos SVG o HTML importados para ejecutar o insertar. Los SVG de salida se generan con primitivas y texto escapado; no se reutiliza markup importado.
- HTML de copia saneado mediante DOMPurify con allowlist reducida. No hay scripts ni URLs aportadas por el usuario en ese HTML.
- CSP en `index.html`: scripts, workers y conexiones al mismo origen; imágenes locales, data/blob; `object-src 'none'`; sin scripts inline. Los estilos inline se permiten para posiciones, colores y controles.
- Service worker acotado a la ruta del proyecto, URLs locales explícitas y cachés con prefijo propio. `ignoreVary` se usa solo para recursos propios precacheados; evita que headers de desarrollo como `Vary: Origin` impidan el modo offline.
- Respaldo validado por completo antes de escribirse. Las restauraciones crean copias. Eliminación desde la UI requiere confirmación y no permite borrar el documento activo.
- Dependencias de ejecución empaquetadas; versiones exactas y lockfile. No se descargan librerías de CDN al iniciar.

## Límites y cuidado de datos

Los datos del navegador no están cifrados con una clave propia de Bridge. Quien tenga acceso al perfil del navegador puede acceder a IndexedDB. El hosting estático y otras aplicaciones del mismo origen deben ser de confianza: en GitHub Pages, repositorios de un mismo usuario comparten origen aunque tengan distintos paths. Esto también afecta la frontera de seguridad de IndexedDB. Un subdirectorio no es un aislamiento entre sitios.

La app no promete defensa absoluta contra agotamiento de memoria: decodificar imágenes o documentos complejos tiene coste. Los límites reducen el riesgo, pero los decodificadores del navegador y su política de memoria siguen siendo parte de la confianza.

El script Windows es opcional y no se ejecuta desde la web. Su modo de extracción binaria puede capturar datos sensibles y solo debe usarse sobre muestras sintéticas con acción explícita. No se suben esas capturas. Los documentos históricos del laboratorio se conservan para auditoría, no como garantía de capacidades vigentes.

Para comunicar un problema, adjuntar un caso mínimo sintético, versión del navegador y pasos; no enviar credenciales ni pizarras confidenciales. No hay un canal externo automático de reporte.

## Intercambio con Microsoft y captura

El HTML nativo se interpreta leyendo un atributo de datos y decodificando JSON; no se monta en el DOM ni se ejecuta. Se validan límites y campos antes de convertir notas, texto o figuras. Se rechazan tipos activos o estructuras desconocidas. El modo Microsoft no cambia silenciosamente a PNG. La captura de muestras solo lee al pegar o pulsar el botón, queda en memoria y se exporta explícitamente a JSON. Conviene capturar objetos sintéticos para evitar compartir contenido privado al entregar el archivo de diagnóstico. No se incluyen ni se descargan programas de Microsoft en tiempo de ejecución.
