Actualización v0.4.1: el usuario confirmó «Funciono el pegado» el 16-10-2026 tras probar el adaptador de v0.4.0. Se registra la confirmación manual global sin atribuir resultados a filas individuales que el usuario no describió.

# Matriz de interoperabilidad externa

Estado al 16-10-2026. **Pegado confirmado por el usuario; sin ejecución automatizada autenticada en Microsoft.** Las filas siguientes son una plantilla para ampliar los resultados por entorno y no invalidan la confirmación recibida. No se marcan todos los tipos como aprobados a partir de ese reporte global.

## Whiteboard → Whiteboard: línea base

Ejecutar cada fila en la misma pizarra y entre dos pizarras nuevas de la misma cuenta. Copia mediante Ctrl+C y, después, menú oficial. Destinos: Web; repetir en Teams si la cuenta lo permite. Navegadores: Edge y Chrome en Windows, versión exacta y dos sesiones.

| Caso | Misma pizarra | Otra pizarra Web | Teams | Evidencia |
| --- | --- | --- | --- | --- |
| Texto | No ejecutado | No ejecutado | No ejecutado | — |
| Nota adhesiva | No ejecutado | No ejecutado | No ejecutado | — |
| Rectángulo | No ejecutado | No ejecutado | No ejecutado | — |
| Elipse | No ejecutado | No ejecutado | No ejecutado | — |
| Flecha | No ejecutado | No ejecutado | No ejecutado | — |
| Línea | No ejecutado | No ejecutado | No ejecutado | — |
| Tinta digital | No ejecutado | No ejecutado | No ejecutado | — |
| Imagen | No ejecutado | No ejecutado | No ejecutado | — |
| Selección múltiple | No ejecutado | No ejecutado | No ejecutado | — |
| Grupo | No ejecutado | No ejecutado | No ejecutado | — |

## Bridge → Microsoft Whiteboard Web

Cada celda representa un experimento separado, en cada navegador/versión. El modo combinado incluye los MIME que el navegador haya aceptado, no los solicitados originalmente si se produjo un fallback.

| Caso | Texto | HTML + texto | PNG | Propio + HTML + texto | Combinado |
| --- | --- | --- | --- | --- | --- |
| Texto | No ejecutado | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| Nota adhesiva | No ejecutado | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| Rectángulo | No ejecutado | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| Elipse | No ejecutado | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| Flecha | No ejecutado | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| Línea | No ejecutado | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| Tinta digital | No ejecutado | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| Imagen | No ejecutado | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| Selección múltiple | No ejecutado | No ejecutado | No ejecutado | No ejecutado | No ejecutado |
| Grupo | No ejecutado | No ejecutado | No ejecutado | No ejecutado | No ejecutado |

PNG es un control de representación visual: aunque se pegue como imagen, no acredita el tipo de nota, figura, tinta o grupo original. Para un objeto que ya era una imagen, verificar por separado sus propiedades y registrar que solo se validó ese tipo, sin extrapolar a otros.

## Protocolo de cada experimento

1. Usar pizarras vacías y datos sintéticos (`BRIDGE-NOTA-001`), sin documentos de trabajo.
2. Registrar fecha, versión del navegador, sistema operativo en observaciones, tipo de cuenta y sesión anónima. No registrar correo, tenant ni tokens.
3. Inspeccionar metadatos de Whiteboard, después los de Bridge. Conservar una comparación de MIME y tamaños; no deducir una semántica por su nombre.
4. Pegar y contar objetos; verificar tipo en menú, texto y propiedades editables, colores, posiciones relativas, dimensiones y grupos.
5. Mover un miembro, editar una propiedad nativa y documentar los controles observados. Capturar evidencia local de la pizarra sintética si procede.
6. Repetir en otra sesión. Usar el laboratorio para registrar checks y exportar JSON. Los registros son manuales; no activan natividad automáticamente.

## Clasificación

- **Aprobado:** tipo y propiedades nativas editables, objetos separados cuando corresponde y repetición documentada. Requiere evidencia local.
- **Parcial:** existe un resultado útil con pérdida de tipo o propiedades. Registrar qué se conserva.
- **Fallido:** no hay resultado o no cumple el objetivo de la prueba.
- **No ejecutado:** no se realizó en ese entorno.
- **Bloqueado por limitación técnica:** permiso/política/API impide ejecutar. Identificar qué bloquea; no significa que todos los navegadores sean incompatibles.

No se demostró que el objetivo sea imposible en todos los escenarios. Sí se sabe que una página estática no puede forzar al destino a reconocer un formato propio, ni acceder por JS a formatos nativos ocultos o inventar permisos de Microsoft.
