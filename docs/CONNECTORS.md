# Conexiones con puntos fijos y codos

## Unir figuras

1. Elige **Figuras → Conector entre dos objetos** y pulsa origen y destino, o arrastra desde uno de los cuatro puntos azules de una figura seleccionada.
2. Cada extremo conserva el lado elegido: arriba, derecha, abajo o izquierda. Mover el destino a otro lado de la pizarra no cambia ese anclaje.
3. El recorrido se construye con segmentos horizontales y verticales. Si las figuras están alineadas puede quedar un segmento recto; cuando están desplazadas aparecen codos.
4. Arrastra un extremo para cambiar su unión. Alt permite dejarlo libre. El panel de propiedades también ofrece los selectores **Unión de origen/destino**.

## Mantener toda la flecha inmóvil

Selecciona la conexión y pulsa **Fijar conexión en el lienzo**, el botón del candado en su barra. Mientras está activa, mover las figuras no cambia sus extremos ni su recorrido. Puedes arrastrar la conexión para moverla manualmente.

**Volver a unir a las figuras** reactiva el seguimiento de sus lados originales. La misma opción aparece en Propiedades como **Seguir las figuras al moverlas**. Esta elección se guarda en el proyecto.

## Mover el recorrido

- Con la conexión seleccionada, arrastra el cuadrado amarillo del codo.
- También puedes arrastrar el cuerpo de una conexión que siga unida a sus figuras: mueve el recorrido y conserva sus extremos.
- El codo queda en las coordenadas elegidas aunque muevas una figura. Se puede editar mediante los campos **Codo X/Y**.
- **Restablecer recorrido automático** elimina ese codo manual. **Recorrido recto / con codos** cambia el estilo conservando los lados de unión.
- Cada arrastre se puede deshacer y rehacer como una sola acción. Cancelar un gesto revierte su previsualización.

El recorrido automático evita atravesar los límites de las dos figuras que une. Para rodear una tercera figura, ajusta el codo manualmente; no se implementa una búsqueda global de rutas en toda la pizarra.

## Guardar y compartir

WBRIDGE y el portapapeles editable de Bridge conservan puntos de unión, ruta, codo y modo fijo. Las exportaciones SVG/PNG dibujan el mismo recorrido y orientan las puntas según su primer/último segmento. El modo de copia para Microsoft mantiene su alcance previo de notas, texto y siete figuras básicas.
