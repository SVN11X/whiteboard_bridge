# Whiteboard Bridge Lab (v0.1.0)

**Laboratorio gratuito, local y experimental para investigar la interoperabilidad del portapapeles con Microsoft Whiteboard Web y Teams.** No pretende ser un clon completo ni asegura compatibilidad nativa; el objetivo es verificarla antes de diseñar un conversor.

> **Nota de vigencia (16-10-2026):** Microsoft anunció el retiro de las aplicaciones independientes de Whiteboard para Windows, Android e iOS desde el 16 de octubre de 2026. El objetivo del laboratorio es Whiteboard Web y la experiencia de Teams para cuentas compatibles. Consulta las fuentes en `docs/FUENTES.md`.

## Ejecución del editor (Windows)

### Opción A: Python 3 instalado

1. Descomprime este ZIP.
2. Abre PowerShell en la carpeta `web`.
3. Ejecuta:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

4. En **Edge o Chrome**, abre `http://localhost:8000`.

En ciertos equipos el lanzador `py` no existe: reemplázalo por `python`.

### Opción B: Visual Studio Code

Abre la carpeta `web` con una extensión de servidor local o la opción de vista previa en localhost. **No** abras desde una dirección `http://` remota sin HTTPS: las API de portapapeles requieren un contexto seguro y permisos.

**No se necesitan Node, npm, dependencias ni claves API.** La aplicación no contacta ningún servidor ni cuenta de Microsoft; el único enlace externo de la interfaz abre Whiteboard a petición del usuario.

## Ejecución del analizador de Windows

Después de **copiar un objeto en Microsoft Whiteboard Web o Teams**:

```powershell
cd .\windows
.\Inspect-Clipboard.ps1 -ReportPath .\captura-texto.json
```

Si el entorno requiere invocar el script desde un proceso de PowerShell, asegúrate de cumplir las políticas de ejecución establecidas por tu organización. El script solo recopila **metadatos de formatos** por defecto y no tiene conexiones de red.

Para capturar **un formato específico registrado** como datos crudos, solo si entiendes el riesgo y estás usando una pizarra de pruebas sin información sensible:

```powershell
.\Inspect-Clipboard.ps1 -DumpFormat 'NOMBRE_EXACTO_DEL_FORMATO' -DumpPath .\privado.bin
```

`-DumpFormat` y `-DumpPath` deben utilizarse juntos. No uses este modo con pizarras de trabajo confidenciales. Los archivos binarios pueden contener texto, tokens o elementos internos; nunca se envían automáticamente. No se interpretan, modifican ni reinyectan formatos propietarios en esta versión.

## Primera prueba de extremo a extremo

1. En Whiteboard Web, crea una **nota adhesiva** con texto único: `NATIVO-PRUEBA-001`.
2. Selecciónala y usa la opción de copiar o `Ctrl + C`.
3. Ejecuta `Inspect-Clipboard.ps1 -ReportPath .\nota-origen.json`. Guarda la lista de formatos.
4. Vuelve al editor del laboratorio, haz clic en **Inspeccionar tipos disponibles** y anota lo que el navegador logra ver.
5. Ahora crea una nota equivalente en Whiteboard Bridge, selecciónala y pulsa **Copiar selección** con `HTML + texto`.
6. Regresa a Whiteboard Web y haz `Ctrl + V` sobre una **pizarra de pruebas**.
7. Intenta editar el texto, cambiar el color de la nota y moverla. Comprueba si Whiteboard la reconoce como una **nota adhesiva nativa** o como texto / imagen.
8. Registra el resultado desde el panel derecho y exporta `whiteboard-bridge-resultados.json`.
9. Repite pasos 5–8 con `Mixto` y `Web JSON`, con cada tipo de objeto. **No asumas que un formato web JSON privado será reconocido por Microsoft Whiteboard**.
10. Si quieres comparar los formatos Windows de los dos orígenes, ejecuta el inspector después de copiar desde Bridge y compara `nota-origen.json` con `nota-bridge.json`.

**Criterio de éxito nativo:** al pegar, la herramienta de Whiteboard muestra la misma clase de objeto (nota, forma, etc.), permite editar propiedades originales (p. ej., cambiar color de una nota) y conserva los elementos por separado. Que aparezca en pantalla NO basta.

## Qué contiene el ZIP

```
whiteboard-bridge-lab/
├── web/
│   ├── index.html         interfaz del editor e instrumentos de prueba
│   ├── styles.css         diseño adaptable de escritorio
│   └── app.js             SVG editable y protocolos experimentales
├── windows/
│   └── Inspect-Clipboard.ps1  inspección Win32 de formatos de portapapeles
├── docs/
│   ├── ARQUITECTURA.md    evolución hacia integración nativa real
│   ├── MATRIZ_PRUEBAS.md casos, observaciones y decisión Go/No-Go
│   └── FUENTES.md         documentación pública consultada
└── tests/
    └── check-static.mjs  comprobaciones estáticas de archivos (no validan pegado)
```

## Limitaciones deliberadas

- La app **no puede garantizar** pegar objetos editables en Whiteboard: depende de lo que Microsoft acepte y de los formatos que utilice.
- Los experimentos no utilizan API de Microsoft Graph para editar objetos internos, porque no se ha verificado una API pública que lo permita.
- El editor no implementa el conjunto completo de funciones de Microsoft Whiteboard ni un lienzo infinito; es un banco de pruebas acotado.
- El inspector Windows enumera formatos Win32 y opcionalmente bloques HGLOBAL. No cubre todos los casos COM `IDataObject`/STGMEDIUM, renderizado diferido u orígenes web.
- Al usar **imagen PNG**, el objeto es editable como imagen (si Whiteboard lo permite), no como la nota, forma o tinta original.
- En aplicaciones corporativas, políticas del navegador, Microsoft 365 o el sistema operativo pueden limitar el portapapeles.

## Privacidad

No hay telemetría, servicios externos ni lectura automática del portapapeles. Tanto leer los tipos del navegador como analizar contenidos binarios requiere una acción explícita. Los reportes del laboratorio no incluyen contenido de las pizarras, salvo el texto que el usuario decida escribir en las **observaciones** de prueba. Los proyectos JSON exportados sí contienen el texto de sus objetos.
