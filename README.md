# Nexo SST — sitio profesional + espacio de empresa

## Qué incluye

- `index.html`: sitio público profesional que presenta los temas del brochure y el alcance de Nexo SST.
- `app.html`: panel con autenticación, perfil de empresa, directorio básico, tareas, módulos SST, gestión documental y evidencia.
- `app.css`, `app.js`, `config.js`: estilos, lógica de interfaz/conexión Supabase y configuración pública del proyecto.
- `migrations/0001_create_nexo_sst_mvp.sql`: esquema inicial de empresa, personal y tareas.
- `migrations/0002_add_sst_modules_and_private_documents.sql`: registros de módulos y bucket privado.
- `migrations/0003_tighten_sst_records_table_privileges.sql`: permisos SST limitados a sesiones autenticadas.
- `migrations/0004_add_iperc_versions_and_hazard_register.sql`: versiones IPERC y registro estructurado de peligros/controles.
- `migrations/0005_add_risk_methodology_and_legal_assessment.sql`: cálculo configurable por empresa, evidencia metodológica por versión y autoevaluación SST general Perú.
- `landing-page.html`: primera maqueta de la página, conservada como referencia.

## Módulos operativos

El panel permite mantener registros administrativos de EPP, Comité SST, incidentes, inspecciones/mapa, emergencias, Plan Anual/RISST, auditorías/monitoreo, agenda administrativa de exámenes, capacitaciones y participación. Estos módulos generales permiten altas, edición, búsqueda, seguimiento y adjuntos según el tipo de módulo.

### IPERC avanzado

Permite organizar matrices por sede/proceso, cargar versiones PDF/Excel/CSV, registrar fecha de revisión y mantener historial. Cada versión incluye riesgos estructurados por puesto y actividad: peligro, evento, consecuencias, controles existentes/adicionales, responsable, fecha y estado. Al crear una versión nueva, se copian sus riesgos de la anterior; las versiones históricas quedan en solo lectura. Los archivos se adjuntan, pero sus filas no se importan automáticamente: los peligros y controles se registran manualmente y se pueden exportar a CSV.

La empresa configura sus escalas de probabilidad y severidad, fórmula aritmética segura con variables P y S, nombres y umbrales de cuatro niveles. Nexo calcula resultados iniciales y residuales de acuerdo con esa configuración; el CSV de riesgos exporta factores, puntajes y niveles calculados. Cada versión guarda una instantánea del método para que editar la configuración no altere el historial. Las valoraciones antiguas en texto se conservan; no se convierten ni se puntúan automáticamente. La app no impone una escala ni certifica que el método elegido sea adecuado.

Los adjuntos se guardan en el bucket privado `sst-documents`, con límite de 15 MiB y acceso autenticado. Registros IPERC genéricos creados anteriormente se conservan en el panel.

### Autoevaluación de requisitos legales SST

Incluye un catálogo inicial de ocho criterios generales para Perú con referencias a la [Ley 29783](https://cdn.www.gob.pe/uploads/document/file/311120/Ley_de_Seguridad_y_Salud_en_el_Trabajo_-_Ley_29783.htm.pdf), su [Reglamento, D.S. 005-2012-TR](https://cdn.www.gob.pe/uploads/document/file/311121/Reglamento_de_la_Ley_N%C2%BA_29783_-_Ley_de_Seguridad_y_Salud_en_el_Trabajo.pdf) y [formatos/guía vinculados a la R.M. 050-2013-TR](https://www.gob.pe/institucion/servir/informes-publicaciones/3572314-modelos-y-formatos-de-seguridad-y-salud-en-el-trabajo-sst). La persona responsable registra el estado, fecha, resumen y referencia de la evidencia observada; Nexo no lee ni valida archivos. El requisito de RISST se muestra como condicional según el número de trabajadores ingresado en el perfil. El catálogo es una base general inicial, no incluye reglas sectoriales ni determina por sí solo la aplicación de cada norma. El resultado es una autoevaluación documentada, no una certificación ni dictamen legal. No se admiten adjuntos en este panel.

La carpeta de evidencia incluye matrices IPERC vigentes, resumen imprimible, CSV y checklist de ocho evidencias con cálculo orientativo de días hábiles. Ese resumen no acredita cumplimiento legal ni combina/folia automáticamente documentos. El indicador de ahorro usa supuestos editables; no es una promesa.

## Vista previa

El servidor del workspace sirve el sitio en el puerto `4173`. Para iniciarlo manualmente:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

La página pública está en `/` y el panel en `/app.html`.

## Datos y autenticación

- Proyecto Supabase separado: `zvktbceizrzhiuyynwas` (región `sa-east-1`).
- El alta de cuenta solicita confirmación de correo.
- `config.js` contiene una publishable key; nunca incluyas la clave `service_role` en el navegador.
- RLS restringe registros y archivos a la empresa propietaria; las tablas SST requieren sesión autenticada.
- Las migraciones `0001`–`0005` están aplicadas al proyecto actual. Cloudflare Pages no ejecuta SQL al desplegar.
- Para producción, conserva el dominio HTTPS en `Site URL` y `Redirect URLs` de Supabase y configura SMTP de producción.

## Privacidad y límites funcionales

No ingresar ni subir diagnósticos, resultados clínicos, EMO, aptitudes individuales ni historias médicas. La agenda de exámenes solo permite coordinación administrativa y no admite adjuntos. OCR/LEO, vigilancia clínica, editor gráfico de mapas, cuentas de colaboradores, firmas electrónicas, elecciones/votos, evaluación/certificados automáticos, generación automática de documentos y paquete PDF foliado no están conectados.

Nexo SST es una herramienta de organización administrativa y no sustituye las obligaciones legales del empleador ni el criterio de profesionales de SST o salud ocupacional.

## Publicación

El proyecto Pages está conectado al repositorio `NEXO_SST_PLATAFORMA` en `main`. Actualiza los archivos de la raíz y confirma el commit para iniciar el redeploy. Para esta ampliación, sustituye `app.html`, `app.js` y `app.css`; conserva `config.js`, `index.html` y `_headers`.
