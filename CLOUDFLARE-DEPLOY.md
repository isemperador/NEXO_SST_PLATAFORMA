# Preparación de Nexo SST para Cloudflare Pages

## Estado

La actualización IPERC está preparada en `cloudflare-export/` y en el paquete local `nexo-sst-iperc-metodologias-controles.zip`. **No se ha publicado en GitHub ni Cloudflare**; no la despliegues hasta contar con confirmación expresa.

La aplicación usa el proyecto Supabase independiente de Nexo SST. La migración `20261102223559_expand_iperc_controls_versions` ya está aplicada allí. Cloudflare Pages no aplica migraciones SQL: no vuelvas a ejecutar una migración ya registrada durante el despliegue.

## Publicación después de confirmación

1. Revisa el diff de `app.html`, `app.js`, `app.css`, `README.md` y la carpeta `cloudflare-export/`.
2. Si se confirma el flujo por Git, actualiza la raíz del repositorio y despliega desde la rama configurada. Si se confirma carga directa, usa el ZIP o carpeta de exportación.
3. Conserva `config.js`, `index.html` y `_headers` de la configuración vigente, salvo que el usuario autorice explícitamente cambios de configuración.
4. En Supabase → Authentication → URL Configuration, verifica `Site URL` y `Redirect URLs` para el dominio final (`/app.html`) antes de habilitar registro/recuperación desde ese dominio.
5. Abre `/` y `/app.html`; prueba autenticación, acceso RLS y flujos IPERC con una cuenta de prueba antes de usar datos reales.

No agregues claves `service_role` al frontend. `config.js` debe conservar solo la publishable key.

## Alcance y límites

La app se limita a lo descrito en `README.md`. En particular, el módulo médico solo permite programación administrativa de exámenes; no almacena resultados clínicos, diagnósticos, historias ni adjuntos EMO. No asumir que la autoevaluación IPERC certifica cumplimiento legal, identifica todos los peligros de campo o confirma eficacia de controles.
