# Matriz de pruebas de interoperabilidad

## Entorno mínimo

- Windows 10/11, Edge o Chrome actualizado.
- Microsoft Whiteboard Web (si la cuenta tiene acceso) y, opcionalmente, Teams.
- Pizarra **nueva de pruebas** sin información privada.
- `Inspect-Clipboard.ps1` en PowerShell de Windows (no PowerShell de Linux).
- Registrar versión del navegador, fecha, tipo de cuenta (personal/empresa, nunca nombre, correo o ID) y aplicación de destino.

| ID | Origen | Objeto | Copia | Destino | Resultado esperado |
|---|---|---|---|---|---|
| B01 | Whiteboard | Texto | Ctrl+C | Mismo Whiteboard | Sigue siendo texto editable (línea base) |
| B02 | Whiteboard | Nota | Menú Copiar | Otra pizarra | Nota editable si es compatible |
| B03 | Whiteboard | Rectángulo | Ctrl+C | Otra pizarra | Forma editable si es compatible |
| B04 | Whiteboard | Tinta | Ctrl+C | Otra pizarra | Tinta con trazos editables si es compatible |
| B05 | Whiteboard | Grupo | Ctrl+C | Otra pizarra | Objetos separados + grupo si es compatible |
| X01 | Bridge | Texto | Texto plano | Whiteboard | Clasificar como texto / imagen / falla |
| X02 | Bridge | Nota | HTML + texto | Whiteboard | Comprobar si se crea nota nativa |
| X03 | Bridge | Nota | Mixto | Whiteboard | Comprobar prioridad de MIME y tipo |
| X04 | Bridge | Rectángulo | HTML + texto | Whiteboard | Comprobar si es figura nativa |
| X05 | Bridge | Rectángulo | PNG | Whiteboard | Imagen (control negativo para forma) |
| X06 | Bridge | Elipse | Web JSON + HTML | Whiteboard | Verificar formato reconocido o degradado |
| X07 | Bridge | Flecha | Mixto | Whiteboard | Verificar si es flecha nativa |
| X08 | Bridge | Selección múltiple | Mixto | Whiteboard | Orden, posiciones y elementos individuales |
| X09 | Bridge | Texto con saltos | HTML + texto | Teams Whiteboard | Equivalencia con Web |

## Métricas

- `pasted`: aparece un resultado tangible.
- `nativeType`: menú de propiedades propio del tipo (nota, figura, tinta, etc.).
- `editable`: el texto se edita como texto; la nota como nota; la forma como forma.
- `layoutPreserved`: posición relativa, dimensiones, orden y color.
- `multiObjectPreserved`: n objetos del origen producen n objetos en destino.

No se deben sumar "imagen editable para recortar" a los casos de "figura editable".

## Análisis diferencial

1. Captura metadatos del portapapeles tras copiar **exactamente un objeto** de Whiteboard (`B01`, `B02` ...).
2. Compara nombres de formatos; identifica repetición entre tipos y formatos nuevos por tipo.
3. Copia el mismo tipo desde Bridge; captura metadatos otra vez.
4. Identifica diferencias **sin asumir** que un nombre de formato contiene la representación real ni que registrar ese nombre bastará para pegar.
5. Solo para una pizarra sintética, considera extracción binaria opt-in de formatos registrados y de tamaño controlado.

## Interpretación final

- **Pasa:** el destino crea el tipo correcto, editable y con propiedades conservadas.
- **Pasa parcial:** se pega, pero se degrada a otro tipo editable.
- **No pasa:** la imagen está plana, el objeto no aparece o no se puede editar como el tipo original.
- **Indeterminado:** el pegado funcionó pero no hay forma clara de verificar tipo o propiedades.

Evita atribuir a Microsoft un formato privado específico sin muestras y validación reproducible.
