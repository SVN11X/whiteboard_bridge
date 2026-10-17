# Agente de IA para generar pizarras

Desde la versión 0.6.0, el sitio publica un paquete para crear un agente en Microsoft 365 Copilot. El agente convierte textos, datos o documentos en un archivo `.json` que Bridge importa sin errores y que después se copia completo a Microsoft Whiteboard con el formato **Microsoft Whiteboard · editable**.

El paquete se abre en **Configuración → Crear con un agente de IA** o en **Más herramientas → Crear con IA**. También está enlazado desde **Exportar → Formatos y ayuda**.

## Archivos

Los archivos están en `public/agente/` y se publican en `https://svn11x.github.io/whiteboard_bridge/agente/`. El service worker los guarda para uso sin conexión.

| Archivo | Uso en el agente |
| --- | --- |
| `instrucciones.txt` | Campo Instrucciones. Define el rol, el flujo de trabajo con preguntas y las reglas que nunca se rompen |
| `conocimiento-pizarras-bridge.txt` | Conocimiento. Formato completo, medida del texto, sistema visual, patrones, banco de preguntas, tabla de errores, ejemplo y script de validación |
| `configuracion.txt` | Nombre, descripción, capacidad recomendada, iniciadores de conversación y pasos de creación |
| `ejemplo-pizarra.json` | Pizarra de referencia. Bridge la importa y la copia a Microsoft sin advertencias |

## Crear el agente en Microsoft 365 Copilot

1. Crear un agente nuevo y abrir la pestaña Configurar.
2. Copiar el nombre, la descripción y las instrucciones.
3. Subir `conocimiento-pizarras-bridge.txt` en Conocimiento.
4. Activar **Crear documentos, gráficos y código** para que el agente ejecute el script, valide la pizarra y entregue un archivo descargable.
5. Agregar los cuatro iniciadores de conversación de `configuracion.txt`.

Los archivos respetan los límites publicados por Microsoft para el creador de agentes: 30 caracteres en el nombre, 1.000 en la descripción y 8.000 en las instrucciones. El conocimiento va en `.txt` porque la carga de archivos acepta documentos de Office, PDF, TXT y CSV, pero no Markdown. Ver [Build agents with Microsoft 365 Copilot](https://learn.microsoft.com/en-us/microsoft-365-copilot/extensibility/agent-builder-build-agents) y [Add knowledge](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/agent-builder-add-knowledge). La disponibilidad del creador de agentes y de la carga de archivos depende de la licencia y de la configuración del tenant.

En un chat sin agentes se pueden pegar las instrucciones y adjuntar el conocimiento en cada conversación.

## Cómo trabaja el agente

1. **Entender.** Resume el tema, el objetivo, el público y las fuentes.
2. **Preguntar.** Hace de 1 a 5 preguntas en un solo mensaje, con opciones y una respuesta sugerida, solo cuando falta algo que cambia el resultado.
3. **Planificar.** Muestra las secciones, el patrón de cada una y el número estimado de objetos.
4. **Generar y verificar.** Construye el JSON con las reglas del conocimiento y recorre la lista de verificación. Con la capacidad de código, usa el script incluido.
5. **Entregar.** Un archivo `.json`, o un bloque de código si no puede crear archivos, más un resumen breve.
6. **Corregir.** Si Bridge rechaza el archivo, el usuario pega el mensaje y el agente corrige solo la causa.

## Qué cuida el formato

La copia a Microsoft solo admite notas, textos y las figuras `rect`, `ellipse`, `triangle`, `diamond`, `pentagon`, `parallelogram` y `capsule`. Una línea, conector, dibujo, imagen o la figura `arrow-shape` hace que Microsoft rechace la copia completa, y los grupos se separan. Por eso el agente dibuja las flechas con triángulos girados, usa solo los 12 colores de notas de Microsoft y deja `groupId` en `null`.

El conocimiento replica la medida del texto de `src/graphics/render.ts` con un margen del 10 % para la letra de Microsoft. Así el agente calcula el alto de cada objeto sin que el texto quede cortado.

## Errores con ubicación

Desde la versión 0.6.0, un archivo inválido muestra el objeto y el campo del primer error, por ejemplo:

```
Proyecto no válido: objeto 4 (id o4), campo label: Invalid input: expected string, received undefined
```

La pizarra abierta no cambia. El mensaje se puede pegar al agente para que corrija solo ese punto.

## Mantenimiento

Si cambian el esquema del documento, el codificador de Microsoft o la medida del texto, hay que actualizar los archivos del agente. `tests/unit/agent.test.ts` falla cuando:

- las instrucciones superan 8.000 caracteres, o el nombre y la descripción superan sus límites
- los textos no mencionan todas las figuras y colores que admite `src/clipboard/whiteboard.ts`
- el ejemplo no se importa, genera advertencias al copiar o tiene textos cortados
- el ejemplo incluido en el conocimiento es distinto de `ejemplo-pizarra.json`
- la tabla de errores del conocimiento no coincide con los mensajes reales de Bridge

El script Python del conocimiento no se ejecuta en CI porque el workflow no instala Python. Se comprobó por separado: genera el ejemplo, su conteo de líneas coincide con el de Bridge y su validador detecta campos faltantes, tipos y figuras prohibidas, colores de notas, notas no cuadradas, fechas sin hora, textos que no caben, superposiciones y `zIndex` incorrectos.

## Privacidad

Los archivos del paquete son texto estático. Bridge no envía datos al agente ni a Microsoft. El contenido que el usuario entrega al agente queda sujeto a las políticas de su tenant de Microsoft 365. Los ejemplos del repositorio usan datos ilustrativos; no se deben publicar pizarras con información de clientes en este repositorio público.
