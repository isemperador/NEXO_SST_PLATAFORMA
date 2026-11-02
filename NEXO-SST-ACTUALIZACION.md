# Actualización de Nexo SST — IPERC avanzado

## Archivos para publicar

En la raíz del repositorio `NEXO_SST_PLATAFORMA`, reemplaza:

- `app.html`
- `app.js`
- `app.css`
- `README.md` (recomendado para mantener la documentación al día)

No reemplaces `config.js`, `index.html` ni `_headers`.

## Funciones nuevas de IPERC

- Crea matrices por sede/proceso y adjunta cada versión en PDF, Excel o CSV (máximo 15 MiB, bucket privado).
- Registra fecha de próxima revisión; el panel marca revisiones vencidas o dentro de los próximos 30 días.
- Crea versiones nuevas conservando las anteriores y copia los riesgos estructurados para que se puedan revisar en la nueva versión.
- Registra manualmente peligros por puesto/actividad, evento de riesgo, consecuencias, controles existentes/adicionales, responsable, fecha y estado. El archivo se adjunta como evidencia; sus filas no se importan automáticamente.
- Conserva valoraciones iniciales y residuales como texto para respetar la escala aprobada por la empresa; Nexo no calcula ni certifica un nivel de riesgo. El registro de riesgos se puede exportar a CSV.
- Las versiones históricas quedan en modo de solo lectura. Los registros IPERC genéricos anteriores se conservan en la sección inferior.
- La matriz vigente y sus archivos aparecen en la carpeta de evidencia y en el checklist.

## Alcance y privacidad

No ingresar ni subir diagnósticos, resultados clínicos, EMO, historias médicas ni aptitudes individuales. El IPERC debe contener información de riesgos laborales y puestos, sin datos médicos personales. La agenda de exámenes sigue siendo administrativa y no admite adjuntos. OCR/LEO, vigilancia clínica, editor gráfico de mapas, firmas electrónicas y automatizaciones de otros módulos siguen fuera de este módulo.

## Supabase

La migración `add_iperc_versions_and_hazard_register` ya fue aplicada al proyecto `zvktbceizrzhiuyynwas` el 2 de noviembre de 2026. El SQL `migrations/0004_add_iperc_versions_and_hazard_register.sql` se incluye para versionado; Cloudflare Pages no ejecuta SQL al desplegar. No vuelvas a ejecutar la migración en el proyecto actual.

## Publicación

Sube los archivos de la app a la raíz del repositorio y confirma el commit en `main`; Pages iniciará el redeploy automático. Conserva `config.js` con la conexión Supabase ya configurada.
