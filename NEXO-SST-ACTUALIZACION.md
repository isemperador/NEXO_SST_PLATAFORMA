# Actualización de Nexo SST — cálculo IPERC y autoevaluación legal

## Archivos para publicar

En la raíz del repositorio `NEXO_SST_PLATAFORMA`, reemplaza:

- `app.html`
- `app.js`
- `app.css`
- `README.md` (recomendado para mantener la documentación al día)

No reemplaces `config.js`, `index.html` ni `_headers`.

## Cálculo IPERC con metodología de la empresa

- Configura por empresa los rangos mínimo/máximo de probabilidad y severidad, el significado de las escalas, una fórmula aritmética con `P` y `S`, y cuatro nombres/umbrales de nivel.
- La fórmula admite números, paréntesis y `+`, `-`, `*`, `/` (también `×`, `÷` y el signo menos matemático). No ejecuta código ni admite funciones arbitrarias. Ejemplo: `P * S`.
- Para calcular se ingresan cuatro factores: probabilidad y severidad iniciales y residuales. Nexo muestra puntaje y nivel según la configuración guardada; el CSV de riesgos incluye factores, puntajes y niveles calculados junto con las notas históricas conservadas.
- La metodología se congela como instantánea por versión. Editar la configuración afecta a matrices/versiones nuevas; al crear una versión se copian los factores y se calculan con el método de esa versión.
- Los valores históricos que solo existían como texto se conservan intactos y no se convierten ni se puntúan automáticamente. Si una escala cambia, revisa los factores copiados antes de usar el nuevo nivel.
- La fórmula y sus bandas son configuradas por la empresa. Nexo no valida que sean apropiadas ni sustituye la revisión competente de SST.

## Autoevaluación de requisitos legales SST — Perú general

- El panel contiene un catálogo base inicial de ocho criterios generales, con referencia normativa y enlace a la fuente, orientación sobre evidencia, fecha y versión del catálogo.
- Por requisito, el responsable puede registrar `Cumple`, `Parcial`, `No cumple`, `No aplica` o `Pendiente`, junto con fecha, persona revisora, resumen de evidencia y referencia/ubicación. Para declarar un estado evaluado se requiere una referencia o un resumen; `No aplica` requiere justificación.
- La aplicabilidad de RISST se condiciona al número de trabajadores guardado en el perfil. Los resultados se presentan como autoevaluación documentada, no como certificado ni dictamen legal.
- El catálogo cubre un punto de partida de SST general en Perú; no es exhaustivo y no incluye normativa sectorial, municipal, convenios ni otras obligaciones específicas de cada empresa. Se debe validar su vigencia, alcance y aplicación con la persona responsable o asesoría competente.
- En este panel no se adjuntan archivos. No ingresar ni subir diagnósticos, resultados clínicos, EMO, aptitudes individuales ni historias médicas. La agenda de exámenes continúa limitada a coordinación administrativa.

Fuentes base enlazadas en el catálogo: [Ley 29783](https://cdn.www.gob.pe/uploads/document/file/311120/Ley_de_Seguridad_y_Salud_en_el_Trabajo_-_Ley_29783.htm.pdf), [D.S. 005-2012-TR](https://cdn.www.gob.pe/uploads/document/file/311121/Reglamento_de_la_Ley_N%C2%BA_29783_-_Ley_de_Seguridad_y_Salud_en_el_Trabajo.pdf) y [materiales de referencia de la R.M. 050-2013-TR](https://www.gob.pe/institucion/servir/informes-publicaciones/3572314-modelos-y-formatos-de-seguridad-y-salud-en-el-trabajo-sst).

## Supabase

La migración `add_risk_methodology_and_legal_assessment` ya está aplicada en Supabase (versión `20261102204009`). Amplía el esquema IPERC y agrega metodología por empresa, catálogo de requisitos y autoevaluaciones con RLS. El SQL de `migrations/0005_add_risk_methodology_and_legal_assessment.sql` se incluye para versionado; Cloudflare Pages no ejecuta SQL al desplegar. No vuelvas a ejecutar la migración en el proyecto actual.

## Publicación

Sube los archivos de la app a la raíz del repositorio y confirma el commit en `main`; Pages iniciará el redeploy automático. Conserva `config.js` con la conexión Supabase ya configurada.
