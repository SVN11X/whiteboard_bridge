# Entrega · Whiteboard Bridge v0.4.1

Base real: `SVN11X/whiteboard_bridge`, commit `c42b4410e9cb7975df6f80155e13579c20479dd7` de `main`. Rama local `fix/compact-chrome-connectors`. Esta entrega no modifica el remoto.

## Cambios solicitados

- Copia renombrada **Microsoft Whiteboard · editable**. Se conserva el payload que funcionó y se retira el aviso experimental. Se registra la confirmación manual del usuario del 16-10-2026 sin inventar una matriz de pruebas externas.
- Cabecera de 52 a **40 px**; barras inferiores y zoom de 56 a **40 px** en escritorio. Reducciones del 23% y 29%, siguiendo la proporción de las dos capturas adjuntas. En móvil las barras de herramientas conservan 44 px de alto.
- Barras blancas por defecto, independientemente del tema. **Configuración → Colores de las barras** permite cambiar por separado la superior y las inferiores/zoom, restaurar blanco y conservar la preferencia al recargar. Texto e iconos ajustan su contraste.
- Flechas con puntas rellenas visibles y color aplicado al trazo. Conectores anclados al contorno de figuras, notas, textos e imágenes; se actualizan al mover, rotar o redimensionar sus objetos.
- Puntos de conexión visibles. Se puede arrastrar desde un punto, dibujar una flecha entre figuras o elegir Conector y pulsar origen/destino. Los extremos seleccionados permiten volver a unir la línea a otro objeto; Alt evita la unión automática. Se conserva undo/redo.
- Se retira el contador visible de objetos y la cantidad de la pestaña Capas.
- Zoom máximo **500%** en botones, rueda, gestos y estado del editor. Vistas antiguas de hasta 800% se normalizan a 500% conservando los objetos.

## Validación y entrega

Ver [TESTING.md](TESTING.md) y `evidence/compact-v0.4.1-*` para resultados de pruebas, medidas y capturas propias. Se revisan escritorio, tableta, móvil, colores personalizados y exportación PNG.

El parche `WHITEBOARD_V0.4.1.patch` contiene únicamente los cambios posteriores a la base indicada y es compatible con `git am`. El proceso de entrega aplica el parche en una copia limpia y compara el árbol resultante con el commit final. El ZIP complementario incluye el repositorio completo y `dist/`.

```bash
git switch main
git am --3way /ruta/WHITEBOARD_V0.4.1.patch
```

Publicar requiere incorporar el commit a `main` y subirlo al repositorio para activar el workflow existente. El modo Microsoft mantiene su alcance: notas, texto y siete figuras; tinta, imágenes, líneas y conectores se conservan mediante WBRIDGE o el formato propio de Bridge.
