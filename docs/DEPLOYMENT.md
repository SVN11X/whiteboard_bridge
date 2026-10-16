# Publicación en GitHub Pages

Destino previsto, aún no publicado: `https://svn11x.github.io/whiteboard-bridge/`.

## Desde PowerShell

Crear primero el repositorio vacío `whiteboard-bridge` en GitHub. Descomprimir el proyecto y abrir PowerShell en su raíz (donde está `package.json`).

```powershell
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
git init -b main
git add .
git commit -m "Implement Whiteboard Bridge web editor and Compatibility Lab"
git remote add origin https://github.com/SVN11X/whiteboard-bridge.git
git push -u origin main
```

No usar `git init` de nuevo si ya existe un repositorio. No es necesario subir `dist`, `node_modules`, capturas privadas ni resultados transitorios de Playwright. El ZIP incluye una copia de `dist` para inspección de la salida compilada; el workflow la reconstruye.

En GitHub, **Settings → Pages → Source: GitHub Actions**. Revisar **Actions → Verify and deploy Whiteboard Bridge**. Un workflow verde con job `deploy` terminado proporciona la URL publicada. Si Pages no está habilitado, `configure-pages` puede fallar hasta configurar esa opción. La ejecución del workflow remoto no se realizó en esta entrega.

## Workflow

`deploy.yml` usa Node 24, `npm ci`, TypeScript, ESLint, Vitest, build y Playwright. Solo publica después de esas comprobaciones. Los pull requests verifican sin desplegar. El job de despliegue recibe `pages:write` e `id-token:write`; el de compilación solo `contents:read`.

Versiones oficiales consultadas el 16-10-2026:

| Acción | Versión fijada |
| --- | --- |
| actions/checkout | v7.0.1 |
| actions/setup-node | v7.1.0 |
| actions/configure-pages | v6.0.0 |
| actions/upload-pages-artifact | v5.0.0 |
| actions/deploy-pages | v5.0.1 |

Fuentes: página de `releases/latest` de cada [checkout](https://github.com/actions/checkout/releases/latest), [setup-node](https://github.com/actions/setup-node/releases/latest), [configure-pages](https://github.com/actions/configure-pages/releases/latest), [upload-pages-artifact](https://github.com/actions/upload-pages-artifact/releases/latest), [deploy-pages](https://github.com/actions/deploy-pages/releases/latest).

## Ruta base

La salida es estática: HTML con módulos JavaScript compilados y CSS locales. No requiere Node en producción. No hay router con rutas profundas; todos los diálogos conservan `/whiteboard-bridge/`. La recarga de la ruta raíz funciona con los archivos estáticos normales.

Para cambiar el nombre del repositorio se deben modificar **ambos** `vite.config.ts` (`base`) y `scripts/build-sw.mjs` (`base`). El manifiesto usa rutas relativas. Volver a compilar y comprobar el service worker desde el nuevo subdirectorio. No reutilizar un SW de un directorio superior con scope global.

## Comprobar al publicar

Abrir la URL con HTTPS; verificar JS/CSS en Network, creación y recarga de una nota, exportación/importación, copia con interacción, manifiesto y registro de SW bajo `/whiteboard-bridge/`. Cerrar otras pestañas de la misma pizarra durante la primera prueba. Después de que el SW termine de instalar, cortar conexión y recargar: la interfaz debe recuperar el documento local.

Los permisos Clipboard pueden depender del navegador y la organización. Un bloqueo de permisos no indica un error de la ruta de GitHub Pages. La PWA requiere primero una carga completa y que el navegador permita su caché.

## Parche de actualización

La entrega incluye `UPGRADE_FROM_V0.2.0.patch`, generado con `git format-patch` sobre el código fuente de la entrega v0.2.0 (`b64602d6b89e455a81532f20949bac793b4d4dd8`). No presupone un commit remoto de SVN11X.

Si se tiene una copia idéntica de la entrega v0.2.0 en un repositorio limpio:

```powershell
git switch -c upgrade/bridge-v0.3.0
git am --3way .\UPGRADE_FROM_V0.2.0.patch
```

El parche agrega el formato `.wbridge`, la importación/exportación visible y sus pruebas. Conserva el legado y el inspector Windows. Si la base local difiere, usar el ZIP completo o resolver las diferencias; no aplicar sobre cambios ajenos sin revisarlos.
