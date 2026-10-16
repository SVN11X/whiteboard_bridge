# Arquitectura y hoja de ruta

## Decisión principal

Priorizar compatibilidad de objetos sobre fidelidad estética. Un clon superficial de UI puede funcionar y no tener ninguna interoperabilidad nativa.

## Capas previstas

```text
┌──────────────────────────────────────────────┐
│ Editor web o cliente escritorio Windows      │
│ SVG/Canvas, selector, inspector de propiedades│
└──────────────────┬───────────────────────────┘
                   │ objetos tipados (schema v1)
┌──────────────────▼───────────────────────────┐
│ Núcleo de documentos                         │
│ Identidad, orden, coordenadas, estilo, grupos│
│ JSON versionado, validación y undo/redo       │
└──────────────────┬───────────────────────────┘
                   │ eventos y selecciones
┌──────────────────▼───────────────────────────┐
│ Motor de portapapeles                        │
│ text/plain | text/html | image/png          │
│ web custom format | adapter hipotético nativo│
└──────────────────┬───────────────────────────┘
                   │ observación y validación
┌──────────────────▼───────────────────────────┐
│ Analizador Windows y laboratorio de pegado    │
│ EnumClipboardFormats / navegador ClipboardAPI│
│ registrar formatos, comparar pruebas         │
└──────────────────┬───────────────────────────┘
                   │ Ctrl+V humano
┌──────────────────▼───────────────────────────┐
│ Microsoft Whiteboard Web / Microsoft Teams   │
└──────────────────────────────────────────────┘
```

## Adapters

- `PlainTextAdapter` (implementado): copia texto; puede perder tipo/estilo.
- `HtmlAdapter` (implementado): HTML con estilos; receptor puede degradarlo.
- `PngAdapter` (implementado): referencia visual; no ofrece natividad.
- `WebCustomAdapter` (implementado): MIME de demostración `web application/x-whiteboard-bridge-lab+json`; **Whiteboard no está obligado a entenderlo**.
- `WhiteboardNativeAdapter` (**NO implementado**): depende de evidencia empírica de formatos e interpretación. No debe prometerse ni desarrollarse sobre hipótesis sin muestras.

## Investigación por etapas

**H0 — Línea base:** copiar un objeto de Microsoft Whiteboard y pegarlo en la misma pizarra; verificar que su tipo y propiedades se conservan. Luego repetir entre dos pizarras.

**H1 — Detección:** enumerar formatos Win32 al copiar texto, nota, figura, tinta, selección múltiple y grupo. Comparar presencia de formatos no estándar, orden y variaciones.

**H2 — Interop web:** usar `navigator.clipboard.read()` (permisos explícitos) y documentar los MIME observables; contrastarlos con Windows. El portapapeles web y Win32 pueden exponer diferentes representaciones.

**H3 — Fallbacks:** copiar nuestros objetos como texto/HTML/PNG. Verificar manualmente cómo interpreta Whiteboard cada formato.

**H4 — Investigación nativa:** solo si existe evidencia de un payload independiente, portable y reproducible sin identidad de sesión/cuenta, investigar estructuras serializadas en un laboratorio aislado. Si el payload refiere IDs, tokens, URLs, sesiones, referencias a un almacén remoto o requiere métodos internos no documentados, tratarlo como señal de que copiar bytes no será suficiente. No ejecutar ingeniería inversa sobre contenidos de terceros ni burlar controles de acceso.

**H5 — Alternativas permitidas:** si no existe interfaz de importación, mantener el clon como editor autónomo o realizar inserción a través de interacción de usuario en la interfaz oficial, siempre con consentimiento. La automatización UI puede crear objetos en la app original pero no equivale a interoperabilidad por portapapeles y es frágil.

## Modelo de objeto propuesto

```json
{
  "schemaVersion": 1,
  "objects": [
    { "id": "o1", "type": "note", "x": 100, "y": 150, "w": 220, "h": 180,
      "text": "Nota editable", "color": "#fde68a" },
    { "id": "o2", "type": "rect", "x": 410, "y": 160, "w": 160, "h": 100,
      "text": "", "color": "#a5b4fc" }
  ]
}
```

Para producción agregar `rotation`, `zIndex`, `style`, `points[]` para tinta, `groupId`, accesibilidad, historial transaccional y restricciones por tipo; documentar un esquema estable con pruebas de migración.

## Recomendación de stack de producción

- **Editor:** TypeScript + React, SVG/Canvas de alto rendimiento, librería gráfica libre seleccionada tras benchmark de 1.000+ objetos.
- **Escritorio Windows:** Tauri + Rust (Win32/COM `IDataObject`, políticas claras de consentimiento), o .NET WPF como alternativa Microsoft-nativa.
- **Almacenamiento:** JSON versionado local y SQLite si se requieren sesiones extensas; exportación/importación reversible.
- **Verificación:** pruebas unitarias del modelo, integración clipboard en Windows, pruebas E2E manuales/automatizadas con sesión de Microsoft Whiteboard de laboratorio.
- **Seguridad:** sin conexión a nube implícita, sin lectura continua, sin guardar el portapapeles bruto por defecto, controles de tamaño, datos no confiables.

## Puerta Go / No-Go

1. Una prueba originada en Whiteboard conserva objetos al pegar en otra pizarra Web de la misma cuenta.
2. Se identifica un formato transmisible desde una app externa sin acceso a credenciales ni servicios internos.
3. Un prototipo mínimo genera un *objeto del mismo tipo* en Whiteboard; no solo una imagen o texto.
4. La prueba funciona de forma repetible, en más de una sesión y en diferentes versiones soportadas del navegador.

**No-Go:** si no se supera 2 o 3, no afirmar interoperabilidad nativa. Priorizar editor autónomo y compatibilidad documental o automatización explícita de interfaz.
