# Nexo SST — sitio profesional + espacio de empresa

## Qué incluye

- `index.html`: sitio público profesional que presenta los temas del brochure y el alcance de Nexo SST.
- `app.html`: panel con autenticación, perfil de empresa, directorio básico, tareas, módulos SST, gestión documental y evidencia.
- `app.css`, `app.js`, `config.js`: estilos, lógica de interfaz/conexión Supabase y configuración pública del proyecto.
- `migrations/0001_create_nexo_sst_mvp.sql`: esquema inicial de empresa, personal y tareas.
- `migrations/0002_add_sst_modules_and_private_documents.sql`: registros de módulos y bucket privado.
- `migrations/0003_tighten_sst_records_table_privileges.sql`: permisos SST limitados a sesiones autenticadas.
- `migrations/0004_add_iperc_versions_and_hazard_register.sql`: versiones IPERC y registro estructurado de peligros/controles.
- `migrations/0005_add_risk_methodology_and_legal_assessment.sql`: metodología de cálculo configurable y tablas de catálogo/evaluación legal anteriores. La pantalla legal fue reemplazada por la comprobación de completitud IPERC; el esquema se conserva y no se elimina.
- `landing-page.html`: primera maqueta de la página, conservada como referencia.

## Módulos operativos

El panel permite mantener registros administrativos de EPP, Comité SST, incidentes, inspecciones/mapa, emergencias, Plan Anual/RISST, auditorías/monitoreo, agenda administrativa de exámenes, capacitaciones y participación. Estos módulos generales permiten altas, edición, búsqueda, seguimiento y adjuntos según el tipo de módulo.

### IPERC: cálculo, sugerencias y prueba de completitud

Permite organizar matrices por sede/proceso, cargar versiones PDF/Excel/CSV, registrar fecha de revisión y mantener historial. Cada versión incluye riesgos estructurados por puesto y actividad: peligro, evento, consecuencias, controles existentes/adicionales, responsable, fecha y estado. Al crear una versión nueva, se copian sus riesgos de la anterior; las versiones históricas quedan en solo lectura. Los archivos se adjuntan, pero sus filas no se importan automáticamente; se pueden exportar riesgos estructurados a CSV.

La empresa configura sus escalas de probabilidad y severidad, fórmula aritmética segura con variables `P` y `S`, nombres y umbrales de cuatro niveles. Nexo calcula resultados iniciales y residuales según esa configuración. Cada versión conserva una instantánea del método; cambiar la configuración no altera los cálculos históricos. Las valoraciones antiguas en texto se conservan sin convertirlas ni puntuarlas automáticamente.

#### Sugerencias de peligros y riesgos

El formulario IPERC incluye un catálogo inicial de 14 sugerencias orientativas para actividades generales de construcción y mantenimiento. Al escribir una actividad/tarea, el sistema filtra el catálogo por palabras relacionadas. La persona puede cargar una sugerencia como borrador, revisar y editar peligro, evento, consecuencias y una idea de control antes de guardar. No se agrega automáticamente ni se asignan factores `P`/`S`: el responsable valida la pertinencia según el puesto y las condiciones reales del lugar. El catálogo es inicial, acotado y no exhaustivo; se debe ampliar/ajustar al conocer las actividades concretas de cada empresa.

#### Botón “Probar autoevaluación IPERC”

En la sección IPERC, el botón revisa la versión seleccionada y calcula un porcentaje de completitud y coherencia básica de la información registrada. Los niveles son `0–49 Bajo`, `50–79 Medio` y `80–100 Excelente`. Revisa, entre otros, alcance de matriz, riesgos estructurados, puesto/tarea, descripción peligro–evento–consecuencia, controles, valoración inicial/residual y seguimiento de acciones abiertas. Los criterios que no aplican según los datos se excluyen del denominador.

El resultado aparece al pulsar el botón y se invalida al modificar o guardar la matriz; vuelve a probarla para ver los cambios. La prueba identifica campos faltantes y alertas para revisión humana, pero no determina si se detectaron todos los peligros en campo, no certifica la eficacia de un control y no representa cumplimiento legal. Un resultado `Excelente` significa que el registro está completo según las comprobaciones de la app, no que la empresa sea legal o técnicamente segura.

La pantalla anterior de autoevaluación de requisitos legales generales de SST ya no se muestra. Sus tablas de base de datos se conservan para no borrar datos ni historial; no se requiere una nueva migración para la prueba de IPERC.

Los adjuntos se guardan en el bucket privado `sst-documents`, con límite de 15 MiB y acceso autenticado. Registros IPERC genéricos creados anteriormente se conservan en el panel.

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
- Las migraciones `0001`–`0005` están aplicadas al proyecto actual. La actualización de sugerencias y comprobación IPERC es lógica de interfaz y no requiere SQL; **no vuelvas a ejecutar `0005`**. Cloudflare Pages no ejecuta SQL al desplegar.
- Para producción, conserva el dominio HTTPS en `Site URL` y `Redirect URLs` de Supabase y configura SMTP de producción.

## Privacidad y límites funcionales

No ingresar ni subir diagnósticos, resultados clínicos, EMO, aptitudes individuales ni historias médicas. La agenda de exámenes solo permite coordinación administrativa y no admite adjuntos. OCR/LEO, vigilancia clínica, editor gráfico de mapas, cuentas de colaboradores, firmas electrónicas, elecciones/votos, certificaciones automáticas, generación automática de documentos y paquete PDF foliado no están conectados.

Nexo SST es una herramienta de organización administrativa y no sustituye las obligaciones legales del empleador ni el criterio de profesionales de SST o salud ocupacional.

## Publicación

El proyecto Pages está conectado al repositorio `NEXO_SST_PLATAFORMA` en `main`. Actualiza los archivos de la raíz y confirma el commit para iniciar el redeploy. Para esta ampliación, sustituye `app.html`, `app.js`, `app.css` y, de forma recomendada, `README.md`; conserva `config.js`, `index.html` y `_headers`.
