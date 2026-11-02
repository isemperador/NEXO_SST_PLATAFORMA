# Nexo SST — sitio profesional + espacio de empresa

## Qué incluye

- `index.html`: sitio público profesional que presenta los temas del brochure y el alcance de Nexo SST.
- `app.html`: panel operativo con autenticación, perfil de empresa, directorio básico, tareas, módulos de SST, gestión documental y evidencia.
- `app.css`, `app.js`, `config.js`: estilos, lógica de interfaz/conexión Supabase y configuración pública del proyecto.
- `migrations/0001_create_nexo_sst_mvp.sql`: esquema inicial de empresa, personal y tareas.
- `migrations/0002_add_sst_modules_and_private_documents.sql`: registros de módulos y bucket privado de evidencia.
- `migrations/0003_tighten_sst_records_table_privileges.sql`: permisos de la tabla limitados a sesiones autenticadas.
- `landing-page.html`: primera maqueta de la página, conservada como referencia.

## Módulos operativos del panel

El panel permite crear, editar, buscar y eliminar registros administrativos para IPERC, EPP, Comité SST, incidentes, inspecciones/mapa, emergencias, Plan Anual/RISST, auditorías/monitoreo, agenda administrativa de exámenes, capacitaciones y participación. IPERC exige adjuntar PDF, Excel o CSV. Los demás módulos admiten adjuntos según tipo. Los archivos están en el bucket privado `sst-documents`, con límite de 15 MiB y acceso por sesión autenticada.

La carpeta de evidencia prepara un resumen imprimible y CSV, más un checklist de ocho evidencias y un cálculo orientativo de días hábiles para organizar un requerimiento. No combina ni folia automáticamente los documentos, no descuenta feriados y no determina cumplimiento legal. El indicador de ahorro usa los supuestos que ingresa el usuario; no es una promesa.

## Vista previa

El servidor del workspace sirve el sitio en el puerto `4173`. Para iniciarlo manualmente desde esta carpeta:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

La página pública está en `/` y el panel de empresa en `/app.html`.

## Datos y autenticación

- Proyecto Supabase separado: `zvktbceizrzhiuyynwas` (región `sa-east-1`).
- El alta de cuenta solicita confirmación de correo.
- La clave publicada en `config.js` es una publishable key; nunca se incluye la clave `service_role` en el navegador.
- RLS restringe registros y archivos a la empresa propietaria; `sst_records` requiere sesión autenticada.
- Las migraciones `0001`, `0002` y `0003` están aplicadas al proyecto actual. Cloudflare Pages no ejecuta SQL al desplegar.
- En un dominio definitivo hay que mantener `Site URL` y `Redirect URLs` de Supabase configurados al HTTPS real y usar SMTP de producción para correos.

## Privacidad y límites funcionales

No ingresar ni subir diagnósticos, resultados clínicos, EMO, aptitudes individuales ni historias médicas. La agenda de exámenes solo admite fechas y coordinación administrativa y no permite adjuntos. OCR/LEO, vigilancia clínica, generador gráfico de mapas, firmas electrónicas, elecciones/votos, evaluación/certificados automáticos, generación automática de documentos y paquete PDF foliado no están conectados; el panel indica las limitaciones donde corresponde.

Nexo SST es una herramienta de organización administrativa y no sustituye las obligaciones legales del empleador ni el criterio de profesionales de SST o salud ocupacional.

## Publicación

El proyecto Pages está conectado al repositorio `NEXO_SST_PLATAFORMA` en la rama `main`. Actualiza los archivos de la raíz y confirma el commit para iniciar el redeploy automático. Para esta ampliación, sustituye `app.html`, `app.js` y `app.css`; conserva `config.js`, `index.html` y `_headers`.
