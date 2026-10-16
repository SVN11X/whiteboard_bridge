# Whiteboard Bridge · v0.3.0

Pizarra web local y laboratorio de interoperabilidad, preparada para **GitHub Pages**. Interfaz en español, React + TypeScript, sin cuenta, backend, claves ni bibliotecas desde CDN. Los objetos se editan y conservan dentro de Bridge.

**El pegado de objetos nativos en Microsoft Whiteboard NO está validado.** El formato propio conserva objetos entre instancias compatibles de Bridge. HTML/texto dependen de lo que admita el destino. PNG es una imagen aplanada. No se genera un archivo `.whiteboard` ni se utiliza una API privada de Microsoft.

## Importar y exportar una pizarra

El formato principal es **`.wbridge`**: un archivo JSON UTF-8 que conserva objetos editables, grupos, conectores, imágenes, posiciones, estilos y zoom.

- **Importar** en la barra superior o **Ctrl+O**: abre `.wbridge` y JSON de Bridge como una nueva pizarra. También acepta PNG/JPEG/WebP/GIF como imágenes en el lienzo actual.
- **Exportar → Pizarra editable · WBRIDGE** o **Ctrl+S**: descarga el proyecto completo.
- **Exportar → Selección editable · WBRIDGE**: descarga solo la selección, incluyendo descendientes de grupos.
- **Exportar → Formatos y ayuda**: muestra la tabla de compatibilidad y un archivo de ejemplo descargable.
- Se conservan exportaciones JSON, SVG y PNG. Las imágenes y el SVG son representaciones visuales.
- Importar valida el archivo antes de abrirlo y conserva la pizarra anterior. `.whiteboard` de Microsoft no tiene un importador validado.

La especificación, límites y comportamiento de grupos están en [FILE_FORMAT.md](docs/FILE_FORMAT.md).

## Ejecutar en desarrollo

Se requiere Node.js 24 LTS (o una versión compatible >=22.12) y npm para compilar. Los visitantes del sitio publicado solo necesitan un navegador.

```powershell
cd whiteboard-bridge
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173/whiteboard-bridge/`. Usar localhost o HTTPS; abrir `index.html` con doble clic no ejecuta correctamente una aplicación de módulos.

```powershell
npm run check
npm run preview
```

Vista de producción: `http://127.0.0.1:4173/whiteboard-bridge/`. `npm run check` comprueba tipos, lint, 29 pruebas unitarias/integración y compilación. Las pruebas adicionales se describen en [TESTING.md](docs/TESTING.md).

## Publicar en GitHub Pages

1. Crear el repositorio público `SVN11X/whiteboard-bridge`, rama `main`.
2. Subir **el contenido de esta carpeta**, incluyendo `.github/workflows/deploy.yml` y `package-lock.json`. No subir `node_modules`.
3. En **Settings → Pages → Build and deployment → Source**, elegir **GitHub Actions**.
4. Hacer push a `main` o ejecutar el workflow. Este compila y publica exclusivamente `dist/` después de pasar las comprobaciones.
5. Abrir `https://svn11x.github.io/whiteboard-bridge/` cuando GitHub confirme el despliegue.

Esta entrega **no está publicada**. La base `/whiteboard-bridge/` ya está configurada. Ver [DEPLOYMENT.md](docs/DEPLOYMENT.md) si se cambia el nombre.

## Uso

- Elegir una herramienta a la izquierda y dibujar con el puntero. Mayús mantiene la proporción de una figura.
- **V** selecciona; Mayús + clic añade objetos; arrastrar un área o usar **L** permite seleccionar varios.
- **N** crea una nota; **T** un texto; **P/M/J** lápiz, rotulador y resaltador; **E** elimina objetos completos.
- Doble clic edita texto. El panel derecho ofrece colores, tamaño, posición, rotación, opacidad, bloqueo, alineación y capas.
- Espacio + arrastrar desplaza. Ctrl + rueda amplía sobre el cursor. Dos dedos permiten desplazar y ampliar. El botón Ajustar centra el contenido.
- Los tiradores permiten redimensionar y rotar; el panel numérico ofrece una alternativa por teclado.
- Seleccionar **Conector**, pulsar un objeto de origen y otro de destino. La flecha se actualiza cuando se mueven sus extremos.
- Ctrl + Z / Ctrl + Mayús + Z deshace/rehace; Ctrl + D duplica; Ctrl + G agrupa; Ctrl + Mayús + G desagrupa. En macOS se usa ⌘.
- Importar imágenes desde el botón o arrastrarlas al lienzo. Se aceptan PNG/JPEG/WebP/GIF y se normalizan a un fotograma PNG local.
- Pulsar el nombre de la pizarra para crear, abrir, duplicar, eliminar, respaldar o recuperar una versión. Para renombrar, abrir **Atajos y ayuda → Nombre de esta pizarra**.
- **Exportar → Pizarra editable · WBRIDGE** conserva objetos en Bridge; se mantiene JSON como alternativa. SVG y PNG son exportaciones visuales.

## Copiar y pegar

1. Seleccionar objetos y elegir un formato en el panel derecho.
2. Pulsar **Copiar selección** o Ctrl + C.
3. Pegar en Bridge con Ctrl + V para probar el formato propio; usar otro tablero o pestaña del mismo sitio para una prueba cruzada.
4. Para Microsoft, abrir Whiteboard Web con una cuenta compatible, pegar manualmente y verificar el tipo con sus herramientas normales.
5. Abrir **Compatibility Lab** para inspeccionar metadatos y registrar el resultado, navegador, cuenta, sesión y evidencia local.

Si el navegador rechaza un formato experimental, la interfaz informa el reintento y los MIME realmente escritos. No hay degradación silenciosa a imagen.

| Modo | Objetos editables en Bridge | Microsoft Whiteboard |
| --- | --- | --- |
| Editable en Bridge | Sí, si el navegador admite `web application/x-whiteboard-bridge+json` | Sin verificar |
| HTML + texto | Pegado como texto si no hay formato propio | Interpretación del destino, sin validación externa |
| Texto plano | Texto | Sin validación externa |
| PNG | Imagen única | Visual; no demuestra natividad |
| Combinado | Formato propio si está disponible | El destino decide; sin validar |

## Datos y privacidad

Autoguardado con 650 ms de espera e IndexedDB; cinco versiones por pizarra, separadas al menos 15 segundos. No hay sincronización con otros dispositivos ni telemetría. Las cuotas y el borrado del almacenamiento dependen del navegador: descargar respaldos es la forma de conservar una copia independiente. Una segunda pestaña editando el mismo documento activa un aviso y pausa el autoguardado al detectar cambios.

La PWA funciona offline después de que se instale su caché. Las actualizaciones se activan con **Guardar y actualizar**. Todo el código distribuido se sirve desde el mismo origen. No se accede a una sesión de Microsoft desde el editor.

## Documentación

- [Formato editable e importación/exportación](docs/FILE_FORMAT.md)
- [Auditoría del prototipo](docs/AUDIT.md)
- [Arquitectura y elección del motor](docs/ARCHITECTURE.md)
- [Investigación del portapapeles y Microsoft](docs/CLIPBOARD_RESEARCH.md)
- [Matriz externa y procedimiento nativo](docs/INTEROPERABILITY_MATRIX.md)
- [Pruebas y mediciones](docs/TESTING.md)
- [Seguridad](docs/SECURITY.md), [limitaciones](docs/LIMITATIONS.md), [hoja de ruta](docs/ROADMAP.md)
- [Informe de entrega](docs/DELIVERY_REPORT.md)

`legacy/v0.1.0/` conserva el prototipo original para comparación; sus documentos son históricos. `windows/Inspect-Clipboard.ps1` conserva el diagnóstico opcional de Windows, separado del editor.
