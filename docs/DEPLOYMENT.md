# Publicación en GitHub Pages

Repositorio: [`SVN11X/whiteboard_bridge`](https://github.com/SVN11X/whiteboard_bridge).
Sitio: [`https://svn11x.github.io/whiteboard_bridge/`](https://svn11x.github.io/whiteboard_bridge/).

## Causa de la página vacía y corrección

Comprobación del 16-10-2026 sobre el commit remoto `131d0140853d9f98c877299b1d508a10e9749d9e`: Pages estaba habilitado y el [último despliegue](https://github.com/SVN11X/whiteboard_bridge/actions/runs/38952109150) terminó correctamente. El HTML respondía 200, pero pedía JavaScript y CSS bajo `/whiteboard-bridge/`, que respondían 404. Los archivos existían bajo `/whiteboard_bridge/`.

La versión 0.3.1 corrigió `base` en `vite.config.ts` y `scripts/build-sw.mjs`, las URLs de Playwright y el enlace esperado al ejemplo. Los nombres del formato, base de datos y portapapeles conservan `whiteboard-bridge`; no son rutas web.

## Actualizar el entorno a v0.4.0

`WHITEBOARD_WORKSPACE_V0.4.0.patch` se genera con `git format-patch` desde el commit remoto `90b35df409d9fe86895dca908f7dc00dfe1a46d0`, que ya contiene la corrección de Pages v0.3.1. Descargar el parche fuera de la carpeta del repositorio. En PowerShell, con Git y Node.js 24:

```powershell
git clone https://github.com/SVN11X/whiteboard_bridge.git
cd whiteboard_bridge
git switch -c feature/whiteboard-workspace
git am --3way ..\WHITEBOARD_WORKSPACE_V0.4.0.patch
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
```

Si ya existe una copia local, actualizarla y crear la rama desde `main`, conservando los cambios propios. No es necesario repetir `git clone` ni `git init`. Si la base difiere, revisar y resolver las diferencias antes de continuar.

Para publicar la corrección revisada:

```powershell
git switch main
git merge --ff-only feature/whiteboard-workspace
git push origin main
```

El ZIP completo es otra forma de obtener los archivos corregidos: copiar su contenido a la raíz del repositorio, sin sustituir `.git`, y registrar los cambios. `dist/` se incluye para inspección; Actions lo reconstruye. No se deben subir `node_modules`, capturas privadas ni resultados transitorios de Playwright.

## Workflow y ruta base

Pages ya está habilitado en este repositorio. El workflow `.github/workflows/deploy.yml` se ejecuta al hacer push a `main`. Usa Node 24, `npm ci`, TypeScript, ESLint, Vitest, build y Playwright, y publica `dist/` después de esas comprobaciones. Los pull requests verifican sin desplegar. El despliegue recibe `pages:write` e `id-token:write`; la compilación solo `contents:read`.

Para una instalación nueva, seleccionar **Settings → Pages → Build and deployment → Source: GitHub Actions**. Revisar **Actions → Verify and deploy Whiteboard Bridge**, incluido el job `deploy`.

La salida es estática: HTML con módulos JavaScript y CSS locales. No requiere Node en producción. No hay rutas profundas; la aplicación permanece bajo `/whiteboard_bridge/`. La recarga de la ruta raíz funciona con archivos estáticos normales.

Si se cambia el nombre del repositorio, ajustar `vite.config.ts` y `scripts/build-sw.mjs`, las dos URLs de `playwright.config.ts` y el enlace esperado en `tests/e2e/files.spec.ts`. Cambiar también el repositorio local predeterminado en `scripts/check-pages.mjs`. El manifiesto usa rutas relativas. No reutilizar un service worker de un directorio superior con scope global.

`npm run build` verifica que los enlaces del HTML y el manifiesto existen dentro de `dist/`, que la ruta coincide con `GITHUB_REPOSITORY` y que el service worker precarga el mismo subdirectorio y el ejemplo editable. Un nombre de repositorio diferente detiene la compilación con un error explicativo. En local, el repositorio predeterminado es `SVN11X/whiteboard_bridge`.

## Comprobar después de publicar

Abrir el sitio con HTTPS y comprobar que JavaScript, CSS, manifiesto y `sw.js` responden 200 bajo `/whiteboard_bridge/`. Crear y recargar una nota, importar/exportar una pizarra y descargar el ejemplo de formatos. Después de que termine de instalarse el service worker, cortar la conexión y recargar: la interfaz debe recuperar el documento local.

Si una pestaña conserva la versión anterior, recargar con Ctrl+F5 o usar **Guardar y actualizar** cuando se ofrezca. Evitar borrar los datos del sitio, pues contienen las pizarras locales. Un bloqueo del portapapeles depende del navegador o sus permisos y no indica un error de la ruta de Pages.
