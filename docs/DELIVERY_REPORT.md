# Entrega · Whiteboard Bridge v0.6.0

Base real: `SVN11X/whiteboard_bridge`, commit `df59f64d2c4b1a479262d0f02091288863444d84` de `main`. Rama local `feat/agente-ia`. Esta entrega no modifica el remoto.

## Cambios solicitados

- **Agente de IA en la página.** Configuración → Crear con un agente de IA, y Más herramientas → Crear con IA, abren el paquete para crear un agente en Microsoft 365 Copilot. Las instrucciones, el conocimiento y la configuración se pueden copiar o descargar, y el ejemplo se abre en Bridge.
- **Agente que pregunta.** Antes de generar, el agente resume lo que entendió y hace de 1 a 5 preguntas con opciones y una respuesta sugerida. Luego planifica, genera, valida y entrega el `.json`. Si Bridge rechaza el archivo, corrige solo la causa.
- **Sin pérdidas al copiar a Microsoft.** El agente usa solo notas, textos y las siete figuras admitidas, sin grupos, y dibuja las flechas con triángulos.

## Correcciones de lo conversado

- Los errores de importación indican el objeto y el campo, así el usuario o el agente corrigen solo esa parte.
- La migración de JSON v1 ya no borra el texto de rectángulos y elipses.
- La documentación del modo Microsoft nombra la píldora (`capsule`) como séptima figura y aclara que la flecha sólida no está incluida.
- El CHANGELOG suma las versiones 0.4.1, 0.5.0 y 0.6.0.

## Validación y entrega

TypeScript, lint, 57 pruebas unitarias e integración, 32 pruebas de navegador y compilación aprobados. Ver [TESTING.md](TESTING.md).

El parche `WHITEBOARD_V0.6.0.patch` contiene solo los cambios posteriores a la base indicada y es compatible con `git am`. Se aplicó en una copia limpia de la base y el árbol resultante coincide con el commit final.

```bash
git switch main
git am --3way /ruta/WHITEBOARD_V0.6.0.patch
```

Publicar requiere subir el commit a `main` para activar el workflow existente.
