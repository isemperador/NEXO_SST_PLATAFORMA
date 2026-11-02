# Actualización de Nexo SST — sugerencias y comprobación IPERC

## Archivos para publicar

En la raíz del repositorio `NEXO_SST_PLATAFORMA`, reemplaza:

- `app.html`
- `app.js`
- `app.css`
- `README.md` (recomendado para mantener la documentación al día)

No reemplaces `config.js`, `index.html` ni `_headers`.

## Qué cambió en IPERC

### Sugerencias de riesgos por actividad

- El formulario de riesgo ahora ofrece un catálogo inicial de 14 sugerencias para construcción y mantenimiento (la opción de rubro que elegiste).
- Al escribir en Actividad/tarea, se filtran sugerencias de peligros y eventos, incluyendo consecuencias posibles y una idea de control orientativa.
- “Usar como borrador” carga los campos en el formulario; no guarda el riesgo, no lo agrega automáticamente a la matriz ni decide probabilidad/severidad. Confirma si aplica a la tarea real, ajusta el puesto y edita lo necesario antes de guardar.
- El catálogo es un punto de partida genérico y no exhaustivo; no reemplaza una visita al lugar ni la revisión con trabajadores y responsable competente de SST. Se puede ampliar con las actividades concretas de la empresa.

### “Probar autoevaluación IPERC”

- Reemplaza visualmente el panel anterior de autoevaluación de requisitos legales generales.
- Al pulsar el botón, revisa la versión IPERC seleccionada y calcula un porcentaje de completitud/coherencia básica de los datos registrados. Bandas elegidas: **0–49 Bajo**, **50–79 Medio**, **80–100 Excelente**.
- Las comprobaciones consideran alcance/revisión de matriz, existencia de riesgos estructurados, puesto y actividad, peligro/evento/consecuencias, controles existentes, valoración inicial y residual, medidas adicionales para riesgos altos/críticos calculables y responsable/fecha de acciones abiertas. Los criterios “no aplica” se excluyen del denominador.
- Presenta fortalezas, campos o criterios por completar y alertas de revisión. El resultado se borra al modificar el formulario o guardar cambios; vuelve a ejecutar la prueba para evaluar la versión actualizada.
- El porcentaje no confirma que se hayan identificado todos los peligros en campo, no certifica la eficacia de los controles y no es una evaluación de cumplimiento legal. “Excelente” significa que el registro cubre los criterios de completitud de la app.
- Las valoraciones históricas en texto siguen conservándose; la prueba no las convierte ni les asigna puntajes.

## Supabase

No hay una nueva migración para estas funciones: son cambios de interfaz y lógica local sobre las tablas IPERC existentes. La migración `add_risk_methodology_and_legal_assessment` permanece aplicada como versión `20261102204009`; **no la vuelvas a ejecutar**.

El panel visible de autoevaluación legal se ocultó, pero las tablas de requisitos y evaluaciones creadas antes se conservan en Supabase para no eliminar datos ni historial. No se alteró ni amplió el alcance médico.

## Verificación y límites

Pasaron las comprobaciones estáticas de JavaScript/HTML/CSS, estructura de controles, cálculo IPERC y catálogo local. No se hizo una prueba E2E con sesión autenticada. Las sugerencias y el porcentaje se generan en el navegador a partir de los datos visibles de la matriz; el resultado de autoevaluación no se guarda como certificación ni como registro legal.

La agenda médica sigue limitada a coordinación administrativa. No agregar resultados clínicos, diagnósticos, historias ni adjuntos EMO.

## Publicación

No se publicó en GitHub ni Cloudflare. Cuando confirmes los cambios, sube los archivos de la app a la raíz del repositorio y confirma el commit en `main`; Pages iniciará el redeploy automático. Conserva `config.js` con la conexión Supabase ya configurada.
