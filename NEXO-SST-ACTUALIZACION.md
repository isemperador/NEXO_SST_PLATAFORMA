# Actualización de Nexo SST — módulo IPERC

## Alcance

La implementación se limita a IPERC. No se publicaron cambios en GitHub ni Cloudflare. Los archivos de entrega están preparados para revisión; no despliegues hasta confirmar.

## Cambios funcionales

### Método configurable por empresa

- Plantillas disponibles: **P × S configurable**, **A + B + C + D referencial** y **metodología propia**.
- Se configuran escalas, fórmula cuando corresponda, cuatro bandas y desde qué nivel la empresa marca un riesgo como significativo.
- Cada versión de matriz conserva un snapshot de fórmula, escalas, bandas, nombres, umbral y notas del método. Cambiar la metodología de la empresa no recalcula versiones anteriores.
- En la plantilla A+B+C+D, el **número real de expuestos** se guarda por separado. El índice A se deriva así: 1–3 personas → A=1; 4–12 → A=2; más de 12 → A=3. Los índices B, C y D se completan por separado y la plantilla calcula P=A+B+C+D y riesgo=P×S.
- La plantilla es referencial. Las cuatro bandas de Nexo son configurables y no se presentan como reproducción literal de las categorías oficiales ni como validación legal.

### Registro de peligros y controles

- Datos del riesgo: puesto, actividad, actividad rutinaria/no rutinaria/emergencia, personas expuestas, tipo de peligro, evento, daño potencial y referencia normativa opcional.
- El campo normativo es solo una **referencia escrita por el usuario**; no se comprueba vigencia, pertinencia ni cumplimiento.
- La clasificación de riesgo significativo sigue el umbral configurado, con opción de ajuste manual y motivo obligatorio.
- Se permiten varios controles por riesgo, diferenciando **existentes** y **planificados**, con jerarquía de eliminación, sustitución, ingeniería, administrativos o EPP, responsable, fecha, estado y evidencia.
- Los factores residuales son una valoración registrada por la persona usuaria. El sistema no asume que una medida planificada ya se implementó ni que un control sea eficaz.
- Las sugerencias de construcción y mantenimiento se cargan como borradores seleccionables y editables. No agregan riesgos automáticamente. El Excel demostrativo sigue separado: adjuntarlo no importa sus filas.

### Versionado y constancia

- La versión incorpora fecha y responsable de elaboración, motivo de cambio, estado de revisión/aprobación, aprobador, fecha, nota o constancia adjunta y archivo original.
- Una aprobación exige aprobador, fecha y nota o constancia. Las versiones históricas o aprobadas y sus riesgos/controles quedan protegidos contra edición; para cambiar contenido se crea una nueva versión.
- Al crear una versión, se copian los datos descriptivos y controles. Los factores numéricos solo se copian si el snapshot completo del método es idéntico; si cambió, quedan vacíos para reingreso humano. El texto histórico se conserva sin conversión automática.

### Autoevaluación documental

Se ejecuta bajo demanda y muestra puntaje, criterios, faltantes y alertas de revisión humana. Considera puestos, actividad/expuestos, descripción y clasificación de peligros, valoración inicial, controles, valoración residual, responsables y seguimiento. Bandas: **0–49 Bajo**, **50–79 Medio**, **80–100 Excelente**.

El resultado evalúa completitud/coherencia documental, no sustituye una revisión en campo, no afirma que se hayan identificado todos los peligros, no certifica eficacia de controles y no determina cumplimiento legal. “Excelente” es solo respecto de los criterios de registro de la aplicación.

## Base de datos Supabase

La migración `20261102223559_expand_iperc_controls_versions` fue aplicada al proyecto Nexo SST (`zvktbceizrzhiuyynwas`, región `sa-east-1`). Se verificaron en el esquema las columnas de metodología, versión y riesgos, y la nueva tabla `iperc_controls`. **No la vuelvas a aplicar** a este proyecto. El archivo correspondiente se conserva como `migrations/0006_expand_iperc_controls_versions.sql` para el historial del repositorio.

El panel legal anterior no se reactivó; sus tablas preexistentes no se eliminaron. El módulo médico permanece limitado a programación administrativa de exámenes: no se agregaron resultados clínicos, diagnósticos, historias, adjuntos EMO ni afirmaciones OCR/LEO activas.

## Verificación y límites

- `node --check app.js`: pasó.
- HTML: 288 IDs únicos; sin selectores IPERC directos faltantes en la revisión estática.
- Preview local en puerto `4173`: HTTP 200.
- Supabase: historial de migración, columnas, RLS (cuatro políticas por tabla IPERC) y triggers de protección/versionado comprobados por consulta de esquema.
- No se hizo una prueba E2E con sesión autenticada ni una prueba de guardado de punta a punta en la app.

## Archivos

- `app.html`, `app.js`, `app.css`: implementación del módulo.
- `migrations/0006_expand_iperc_controls_versions.sql`: migración aplicada en el proyecto conectado.
- `IPERC_demo_realista_construccion_mantenimiento.xlsx`: demostración separada de la aplicación; contiene datos ficticios.

`cloudflare-export/` y el paquete de entrega local contienen una copia de los archivos, pero no se publicó ni se desplegó. Antes de desplegar, revisar el diff y confirmar expresamente.
