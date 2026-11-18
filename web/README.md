# VideoVault Web

Versión web con React/Vinext y un servicio compatible con Cloudflare Workers. Acepta enlaces HTTPS públicos, detecta archivos por Content-Type y extrae medios publicados en HTML (OpenGraph, video/audio/source y contentUrl/video_url). Las descargas pasan por un endpoint que valida el destino y devuelve el archivo como adjunto sin almacenarlo en el servidor.

## Publicar

El sitio se despliega como un Worker de Cloudflare: la misma pieza sirve las
páginas y los endpoints `/api/*`. No depende de ChatGPT ni de Sites para que
alguien pueda entrar; solo el código vive en GitHub, y GitHub dispara el
despliegue.

`.github/workflows/web.yml` ejecuta tests, tipos, lint y build en cada push que
toque `web/`, y publica si existen los secretos. Sin ellos compila igual y avisa
en el resumen del run, pero no publica.

### Pasos, una sola vez

1. Crea una cuenta en Cloudflare.
2. Activa **R2** y crea un bucket llamado exactamente `videovault-media`.
   El código lo necesita: guarda ahí los archivos descargados, los resultados
   reutilizables y las esperas por HTTP 429. Sin ese bucket, `/api/resolve`
   falla en cada petición. **Cloudflare suele pedir un método de pago para
   activar R2 aunque te quedes dentro del nivel gratuito.**
3. Copia tu **Account ID** del panel de Cloudflare.
4. Crea un **API token** con permiso de edición sobre Workers y lectura y
   escritura sobre R2. La plantilla de Workers del panel sirve de base; añade
   R2 encima.
5. En GitHub, en **Settings → Secrets and variables → Actions**, añade dos
   secretos del repositorio:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
6. Haz un push que toque `web/`, o lanza el workflow a mano desde la pestaña
   Actions.

Queda publicado en `https://videovault.<tu-subdominio>.workers.dev`. Los nombres
exactos de las pantallas del panel de Cloudflare cambian de vez en cuando; los
permisos que hacen falta son los de arriba.

### Desde tu propio equipo

```sh
npx wrangler login
npm run build
npx wrangler deploy --config dist/server/wrangler.json
```

Añade `--dry-run` para validar la configuración sin publicar nada.

## Estructura

Cada herramienta es una entrada de `lib/tools.ts`, no una página escrita a mano:
ese catálogo genera la navegación, los enlaces cruzados, los metadatos y el texto
de cada ruta. Añadir una herramienta es añadir una entrada y una página de tres
líneas que la pasa a `ToolPage`.

- `/` hub, `/reel`, `/video`, `/foto`, `/audio`: misma plantilla, distinto formato
  inicial del descargador.
- `/privacidad`, `/terminos`: páginas estáticas enlazadas desde el pie.
- `components/downloader.tsx`: todo el estado del formulario y de los resultados.
- `components/sections/`: pasos, ventajas, enlaces cruzados y FAQ.
- `app/styles/`: tokens en `base.css`, luego `layout`, `downloader` y `sections`.
  Los colores salen de variables CSS; no añadas hex sueltos.

El FAQ usa `<details>` para que funcione sin JavaScript.

## Desarrollo

Requiere Node 22.13+ y npm.

```sh
npm run install:ci
npm run dev
node --test tests/*.test.ts
npx tsc --noEmit
npm run build
```

El historial se conserva solo en localStorage del navegador. No hay cuentas adicionales ni sincronización con Android. Los archivos de hasta 100 MB se conservan en el almacenamiento privado R2 al descargarlos. HLS, páginas que requieren JavaScript o sesión y medios protegidos no están soportados en esta primera versión. Los destinos deben resolver a direcciones públicas; se validan también las redirecciones. El servidor remoto puede rechazar solicitudes por sus propias restricciones.

El manifiesto `.openai/hosting.json` identifica el Site privado. Publicar usando la habilidad Sites, su helper de código fuente y el artefacto de `dist/`.

El selector Vídeo/Audio/Imagen filtra los resultados y muestra cuántos hay por tipo.
Por defecto se buscan vídeos. Las imágenes OpenGraph se identifican como portadas;
si solo hay portadas, se informa que no se encontró vídeo. La opción Audio permite descargar pistas independientes o extraer la pista AAC
de vídeos MP4 en formato M4A sin recomprimirla, con un límite de 32 MB por vídeo.

Ante HTTP 429 se conserva el código de estado y Retry-After, y el formulario
muestra una espera antes de reintentar. El servidor evita nuevas solicitudes al
mismo origen durante esa espera. Los resultados públicos se reutilizan durante
dos minutos y se unen búsquedas simultáneas del mismo enlace, dentro de cada
instancia de Worker. No se reintenta automáticamente ni se garantiza que el sitio
levante sus restricciones al terminar el contador.

Las variantes de un enlace de Instagram (parámetros de seguimiento, dominio sin
www y rutas de Reel) comparten una búsqueda por publicación. Las actualizaciones
simultáneas se unen dentro de la instancia. Si una actualización recibe 429, se
conservan los resultados previos y se devuelve el tiempo de espera también en la
respuesta exitosa de respaldo. La interfaz conserva esa espera al recargar y no
permite actualizar álbumes durante ella; buscar archivos guardados sigue disponible.
Los registros de fallos identifican la etapa (página, consulta pública o embed),
sin incluir tokens, contenido ni URL de publicación. Estas medidas reducen las
consultas evitables, pero no eliminan las restricciones impuestas por Instagram.

Para publicaciones de Instagram, si el HTML original no contiene vídeo se consulta
su API de lectura pública usando el token anónimo publicado en ese HTML (sin cookies
de cuenta). Solo se aceptan medios del campo if_not_gated_logged_out. Si la consulta
no entrega vídeo se consulta una vez su página pública de inserción. Se leen
video_url y video_versions; si
Instagram no entrega medios públicos, se informa sin atribuir una causa segura
ni tratar la portada como vídeo. No se usa sesión de Instagram ni se garantiza
compatibilidad con publicaciones restringidas o no disponibles.

Las páginas y consultas usan un límite de 20 segundos; las descargas disponen de
hasta 10 minutos para transmitir el archivo sin que el límite corto corte el vídeo.


## Disponibilidad y archivo privado

El binding R2 `BUCKET` guarda los archivos y resultados para servir descargas ya
obtenidas sin volver a consultar el origen ni depender de URLs firmadas caducadas.
Las búsquedas muestran explícitamente cuándo se devuelve un archivo guardado.
Una portada de Instagram no se trata como un vídeo guardado. Los resultados sin
archivo solo se reutilizan durante dos minutos.

La espera por HTTP 429 se comparte mediante R2 entre instancias y reinicios.
Se respeta Retry-After; sin ese encabezado se aumenta la espera gradualmente.
Se reutiliza durante quince minutos el token público anónimo de la página de
Instagram, sin cookies ni credenciales de cuenta, para reducir consultas HTML.
Un origen que rechace una primera consulta sigue pudiendo impedir obtener un
enlace nuevo; guardar archivos previos no elimina esa restricción.

`POST /api/archive` permite restaurar un archivo multimedia ya obtenido (hasta
40 MB), con Content-Type, Content-Length y X-Source-Url. Requiere el acceso del
Site, que debe conservarse privado para su propietario. No exponer este endpoint
cambiando la audiencia a pública sin añadir autorización de escritura.


## Extracción de audio

`GET /api/audio?id=<video-id>` extrae la pista AAC del vídeo privado guardado y
conserva un M4A de audio, sin pistas de vídeo, en R2. También acepta `url` cuando
el archivo todavía no está guardado, validando el destino público y los límites
de tamaño antes de procesarlo. MP4Box realiza la separación sin recodificar.
La interfaz muestra «Extraer audio M4A», progreso y errores de forma explícita.
Los vídeos sin sonido o con pistas no compatibles devuelven un error legible.


## Imágenes y álbumes

Se conserva la lista completa de un carrusel aunque solo se haya descargado una
parte. Instagram devuelve fotos y portadas de vídeo; se escoge la variante de
mayor resolución que respeta la proporción original. La respuesta avisa cuando
el origen entrega menos posiciones que el tamaño declarado del álbum.

«Actualizar álbum» renueva los enlaces sin borrar vídeos y audios ya guardados.
«Descargar imágenes (ZIP)» descarga secuencialmente todas las imágenes mostradas,
con progreso y nombres ordenados; un fallo no produce un ZIP parcial como éxito.
El ZIP admite hasta 100 MB en total y cada imagen hasta 32 MB.

Las descargas de imágenes validan longitud y los cierres de JPEG/PNG/GIF/WebP.
Las respuestas HTTP 206 incompletas se rechazan. Una imagen rota ya guardada no
se vuelve a servir como completa; se intenta obtener de nuevo desde su enlace.
Las vistas previas usan object-fit: contain para mostrar todo el encuadre.
