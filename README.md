# Nexo SST — sitio profesional + espacio de empresa

## Qué incluye

- `index.html`: sitio público profesional que presenta los temas del brochure y el alcance de Nexo SST.
- `app.html`: panel con autenticación, perfil de empresa, directorio básico, tareas, módulos SST, gestión documental y evidencia.
- `app.css`, `app.js`, `config.js`: estilos, lógica de interfaz/conexión Supabase y configuración pública del proyecto.
- `migrations/0001_create_nexo_sst_mvp.sql`: esquema inicial de empresa, personal y tareas.
- `migrations/0002_add_sst_modules_and_private_documents.sql`: registros de módulos y bucket privado.
- `migrations/0003_tighten_sst_records_table_privileges.sql`: permisos SST limitados a sesiones autenticadas.
- `migrations/0004_add_iperc_versions_and_hazard_register.sql`: versiones IPERC y registro estructurado de peligros.
- `migrations/0005_add_risk_methodology_and_legal_assessment.sql`: configuración inicial de metodología y tablas anteriores de catálogo/evaluación legal. La pantalla legal ya no se muestra; el esquema se conserva.
- `migrations/0006_expand_iperc_controls_versions.sql`: snapshot ampliado de métodos, campos de riesgos, controles múltiples, metadatos de aprobación y protecciones de historial. Aplicada al proyecto conectado como `20261102223559_expand_iperc_controls_versions`.
- `landing-page.html`: primera maqueta de la página, conservada como referencia.

## Módulos operativos

El panel permite mantener registros administrativos de EPP, Comité SST, incidentes, inspecciones/mapa, emergencias, Plan Anual/RISST, auditorías/monitoreo, agenda administrativa de exámenes, capacitaciones y participación. Estos módulos generales permiten altas, edición, búsqueda, seguimiento y adjuntos según el tipo de módulo.

### IPERC: métodos configurables, controles y autoevaluación documental

Permite organizar matrices por sede/proceso, adjuntar versiones PDF/Excel/CSV, registrar fechas y responsables, documentar el motivo de cambio, aprobación/constancia y archivo original. Cada versión conserva su snapshot del método. Las versiones históricas o aprobadas, incluidos sus riesgos y controles, son de solo lectura; se crea una nueva versión para hacer cambios. Al clonar, se copian descripciones y controles; los factores numéricos solo se conservan si el snapshot metodológico completo es idéntico. Si cambió, deben reingresarse. Los archivos se adjuntan, pero sus filas no se importan automáticamente; se pueden exportar riesgos estructurados a CSV.

La empresa puede elegir **P × S configurable**, la plantilla **A + B + C + D referencial** o una metodología propia. Se guardan escalas, fórmula, cuatro bandas y el umbral configurable de riesgo significativo. El número real de expuestos es un campo independiente; en A+B+C+D se deriva A como 1 para 1–3 personas, 2 para 4–12 y 3 para más de 12. B, C y D se ingresan por separado. Las cuatro bandas de Nexo son configurables y no se anuncian como reproducción literal de categorías oficiales ni como verificación legal. El campo “referencia normativa” es texto de referencia, no una comprobación de cumplimiento.

Cada riesgo registra puesto, actividad y tipo de actividad, expuestos, tipo de peligro, evento, daño potencial y evaluaciones inicial/residual. Admite controles múltiples diferenciados como **existentes** o **planificados**, organizados por jerarquía (eliminación, sustitución, ingeniería, administrativos y EPP), con responsable, fecha, estado y evidencia. La valoración residual la introduce el usuario; la aplicación no da por eficaces las medidas planificadas ni certifica controles.

Las valoraciones antiguas guardadas en texto se conservan sin convertirlas ni puntuarlas automáticamente al cambiar el método.

#### Sugerencias de peligros y riesgos

El formulario incluye un catálogo inicial de 14 sugerencias orientativas para construcción y mantenimiento. Al escribir una actividad, se filtran ideas de peligros, eventos, consecuencias y posibles controles. “Usar como borrador” carga una sugerencia seleccionable y editable; no crea riesgos ni asigna factores automáticamente. La pertinencia debe revisarse para la tarea y el lugar reales. El catálogo es inicial y no exhaustivo.

#### Botón “Probar autoevaluación IPERC”

Bajo demanda, revisa completitud y coherencia documental de puestos, actividades/expuestos, peligros, evaluación inicial, controles, riesgo residual, responsables y seguimiento. Muestra puntaje, fortalezas, recomendaciones y alertas para revisión humana. Bandas: `0–49 Bajo`, `50–79 Medio` y `80–100 Excelente`; los criterios no aplicables se excluyen del denominador.

El resultado no confirma que se hayan identificado todos los peligros en campo, no certifica la eficacia de los controles y no constituye una evaluación de cumplimiento legal. “Excelente” describe solo el grado de completitud respecto de las comprobaciones documentales de la aplicación.

La pantalla anterior de autoevaluación de requisitos legales generales de SST ya no se muestra. Sus tablas de base de datos se conservan para no borrar datos ni historial. Los adjuntos IPERC usan el bucket privado `sst-documents`, con acceso autenticado y límite de 15 MiB.

La carpeta de evidencia también incluye matrices IPERC vigentes, resumen imprimible, CSV y checklist de ocho evidencias con cálculo orientativo de días hábiles. Ese resumen no acredita cumplimiento legal ni combina/folia automáticamente documentos. El indicador de ahorro usa supuestos editables; no es una promesa.

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
- Las migraciones `0001`–`0006` están aplicadas al proyecto Supabase actual; `0006_expand_iperc_controls_versions.sql` figura como `20261102223559_expand_iperc_controls_versions`. No vuelvas a aplicar migraciones ya registradas. Cloudflare Pages no ejecuta SQL al desplegar. La verificación de esquema se hizo, pero no una prueba E2E autenticada de guardado.
- Para producción, conserva el dominio HTTPS en `Site URL` y `Redirect URLs` de Supabase y configura SMTP de producción.

## Privacidad y límites funcionales

No ingresar ni subir diagnósticos, resultados clínicos, EMO, aptitudes individuales ni historias médicas. La agenda de exámenes solo permite coordinación administrativa y no admite adjuntos. OCR/LEO, vigilancia clínica, editor gráfico de mapas, cuentas de colaboradores, firmas electrónicas, elecciones/votos, certificaciones automáticas, generación automática de documentos y paquete PDF foliado no están conectados.

Nexo SST es una herramienta de organización administrativa y no sustituye las obligaciones legales del empleador ni el criterio de profesionales de SST o salud ocupacional.

## Publicación

Esta actualización no se ha publicado en GitHub ni Cloudflare. Tras la confirmación del usuario, actualizar los archivos de la raíz y revisar el diff antes de confirmar el commit o cargar `cloudflare-export/`. Para esta ampliación corresponden `app.html`, `app.js`, `app.css` y `README.md`; conservar `config.js`, `index.html` y `_headers`.
