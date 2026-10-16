# Entrega · Whiteboard Bridge v0.5.0

Base real: `SVN11X/whiteboard_bridge`, commit `771ecb1227b11b2846f2e2813ab052e4543a7889` de `main`. Rama local `feat/fixed-ports-templates`. Esta entrega no modifica el remoto.

## Cambios solicitados

- **Menú de figuras y barra de selección claros.** Se corrige el fondo negro que ocultaba líneas y flechas en la captura. Ambos usan el color de la barra inferior, blanco por defecto incluso con tema oscuro. La personalización continúa en Configuración → Colores de las barras.
- **12 plantillas editables**, nueve más que antes: lluvia de ideas, plan de trabajo, mapa de ideas, DAFO, retrospectiva, prioridades, plan de proyecto, agenda, línea de tiempo, flujo, empatía y comparación. Incluyen búsqueda, categorías y miniaturas de su contenido real. Al insertarlas se encuadra la plantilla y un clic permite escribir en cada elemento.
- **Conexiones con lados fijos y codos de 90°.** La unión conserva el lado elegido; no se desliza hacia la otra figura al moverla. El recorrido se puede ajustar mediante el cuadrado amarillo, arrastrando la conexión o desde Propiedades. Se pueden cambiar los lados y volver al recorrido automático o recto.
- **Fijar conexión en el lienzo** mantiene la flecha completa inmóvil, aunque se muevan las figuras. La conexión se puede mover manualmente y volver a unir a sus figuras. La elección, los anclajes y el codo se guardan en WBRIDGE.
- Se conserva el mismo recorrido en lienzo, SVG y PNG; las puntas siguen el segmento final. Las líneas se seleccionan por su trazo y los textos de figuras quedan centrados verticalmente.

## Validación y entrega

TypeScript, lint, 50 pruebas unitarias/integración, 29 pruebas de navegador y compilación aprobados. Se revisan escritorio, tableta, móvil, paletas en tema oscuro, las doce miniaturas, fijación de conexiones y exportación PNG. Ver [TESTING.md](TESTING.md) y `evidence/routing-v0.5-*`.

El parche `WHITEBOARD_V0.5.0.patch` contiene únicamente los cambios posteriores a la base indicada y es compatible con `git am`. El proceso de entrega aplica el parche en una copia limpia y compara el árbol resultante con el commit final. El ZIP complementario incluye el código completo y `dist/`.

```bash
git switch main
git am --3way /ruta/WHITEBOARD_V0.5.0.patch
```

Publicar requiere incorporar el commit a `main` y subirlo al repositorio para activar el workflow existente. El recorrido automático considera las dos figuras conectadas; para rodear una tercera se mueve el codo. El modo Microsoft conserva su alcance previo de notas, texto y siete figuras; WBRIDGE o el formato propio de Bridge conservan los conectores.
