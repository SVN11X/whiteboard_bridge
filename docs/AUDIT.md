# Auditoría del archivo base

Entrada: `whiteboard-bridge-lab-v0.1.0(1).zip`, 15 entradas, 51.816 bytes descomprimidos. Inspección de todos los archivos de código, documentación, comprobación estática y script PowerShell. La base se importó a un commit local antes de editar; no se recibió un repositorio remoto ni un commit de GitHub.

## Hallazgos

| Hallazgo del prototipo | Consecuencia | Tratamiento |
| --- | --- | --- |
| JavaScript monolítico, cinco tipos de objeto | Interacciones y protocolos acoplados | Núcleo tipado y módulos independientes |
| SVG fijo de 1400×900 | Desplazamiento de un área, no viewport de un plano | Transformación mundo/pantalla y culling |
| Sin historial, resize, rotación, grupos ni tinta | Edición limitada | Implementados en v0.2.0 |
| Datos solo en memoria | Se pierden al recargar | IndexedDB, autoguardado, revisiones y respaldos |
| Importador descarta identidades, limita silenciosamente valores | Potencial pérdida de estructura | Migración explícita y validación estricta |
| Formato personalizado sin detección/fallback | Un MIME rechazado puede cancelar toda la copia | Detección, reintento estándar y reporte real de MIME |
| Reporte manual sin navegador ni criterios de editabilidad | No permite reproducir resultados | Laboratorio con entorno, sesión, checks y evidencia |
| Contenedor con `min-width:850px` | Desborda en móvil | Layout a 360 px y panel plegable |
| Sin build, manifiesto, service worker ni workflow | No hay entrega de aplicación mantenible | Vite, PWA y Pages con validaciones |
| Prueba estática busca cadenas | No comprueba edición ni interoperabilidad | Unitarias, integración y E2E |
| HTML dice que Windows enumera «todos» los formatos | Afirmación más fuerte de lo que hace el inspector | Documentación nueva aclara límites Win32/COM |

## Elementos conservados

El prototipo y sus documentos permanecen en `legacy/v0.1.0/`. Sus conceptos útiles se reutilizan: objetos independientes, representación SVG, copia texto/HTML/PNG/JSON, importación JSON y registro manual de resultados. La funcionalidad se reemplaza en el editor nuevo; no se muestra el laboratorio antiguo como aplicación vigente.

`windows/Inspect-Clipboard.ps1` conserva su versión recibida. Se revisó el código: lectura Win32 de metadatos por defecto; extracción HGLOBAL opcional con límite. No se ejecutó: este entorno es Linux. No cubre COM IDataObject, todos los medios STGMEDIUM ni todos los formatos de renderizado diferido.

## Resultado de la auditoría de natividad

El ZIP no contenía muestras verificadas de Microsoft Whiteboard, encoder propietario ni evidencia de pegado nativo. Por tanto, no existe un adaptador nativo operativo que preservar. El proyecto nuevo tampoco inventa uno.
