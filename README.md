# Nexo SST · GitHub + Cloudflare Pages

El contenido desplegable está dentro de `public/`. Sube la carpeta `public` al repositorio de GitHub.

En Cloudflare Pages selecciona:
- Production branch: `main`
- Framework preset: `None`
- Build command: dejar vacío (o `exit 0` si el formulario lo exige)
- Build output directory: `public`

Después del primer despliegue, agrega la URL `https://<proyecto>.pages.dev/app.html` a Supabase → Authentication → URL Configuration → Redirect URLs. El `Site URL` puede ser la raíz `https://<proyecto>.pages.dev`.

`config.js` usa una publishable key de Supabase. No reemplazarla por `service_role`.
