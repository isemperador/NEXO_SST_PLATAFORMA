# Actualización de Nexo SST

## Archivos para publicar

En la raíz del repositorio `NEXO_SST_PLATAFORMA`, reemplaza:

- `app.html`
- `app.js`
- `app.css`

No reemplaces `config.js` ni `index.html`. Mantén esos archivos y `_headers` existentes.

## Qué incluye esta versión

- Selector claro/nocturno persistido en el navegador.
- Módulos con alta, edición, búsqueda y eliminación de registros: IPERC, EPP, Comité SST, incidentes, inspecciones/mapa, emergencias, Plan Anual/RISST, auditorías/monitoreo, agenda administrativa de exámenes, capacitaciones y participación.
- IPERC exige adjuntar un archivo PDF, Excel o CSV. Los archivos se guardan en el bucket privado de Supabase `sst-documents` y se descargan con sesión autenticada. Límite: 15 MiB.
- Carpeta de evidencia con resumen imprimible, CSV y checklist de requerimiento con cálculo orientativo de días hábiles (no descuenta feriados).
- Indicador de horas/valor anual referencial, con supuestos editables.

## Privacidad y límites del MVP

No registrar ni subir diagnósticos, resultados clínicos, EMO, historias médicas ni aptitudes individuales. La agenda de exámenes solo permite fechas y coordinación administrativa y no acepta adjuntos. OCR/LEO, vigilancia clínica, mapa gráfico, firmas electrónicas, elecciones digitales, generación automática de documentos y paquete PDF foliado no están conectados; la interfaz los identifica como funciones futuras o no activas.

## Supabase

Las migraciones `add_sst_modules_and_private_documents` y `tighten_sst_records_table_privileges` ya fueron aplicadas al proyecto `zvktbceizrzhiuyynwas` el 2 de noviembre de 2026. Se incluyen en `migrations/` solo para referencia/versionado; Cloudflare Pages no ejecuta SQL al desplegar. No hace falta volver a ejecutarlas en el proyecto actual.

## Publicación

El sitio usa Cloudflare Pages conectado a GitHub. Después de subir los archivos a la raíz, confirma el commit en la rama `main`; Pages debe iniciar el redeploy automático. `config.js` conserva la conexión Supabase que ya estaba funcionando.
