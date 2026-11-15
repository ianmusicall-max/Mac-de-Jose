# AGENTS.md

VideoVault es una app Android propia, escrita desde cero con Kotlin y Jetpack
Compose, para descargar vídeo, audio e imágenes. `web/` contiene la versión web.

## Android

Requiere JDK 17+ y Android SDK API 36. Configura `sdk.dir` en `local.properties`
(archivo local ignorado por Git, sin comentarios al final de la ruta).

- `./gradlew test`: pruebas unitarias.
- `./gradlew assembleDebug`: APK en `app/build/outputs/apk/debug/app-debug.apk`.
- `./gradlew installDebug`: instalar en dispositivo Android conectado.

En `app/src/main/java/com/macdejose/videovault/`:

- `ui/`: pantallas Compose y ViewModels.
- `resolver/`: cadena de detección, Instagram, HTML, HLS y enlaces directos.
- `download/`: cola, descarga HTTP/HLS, servicio, notificaciones y FileStore.
- `data/db/`: Room; `data/prefs/`: ajustes DataStore; `data/repo/`: acceso desde UI.
- `statuses/`: lectura de estados mediante SAF.
- `AppContainer`: inyección manual de dependencias.

CI (`.github/workflows/android.yml`) ejecuta `test` y `assembleDebug` con JDK 17
y SDK 36; sube `videovault-debug-apk` y reportes si falla. Pushes solo de Markdown
no lanzan ese workflow. No ejecuta pruebas en dispositivo.

La firma debug fija es intencional para instalar actualizaciones sobre APKs
anteriores. No utilizarla para publicación release. Las descargas HLS cifradas
se rechazan. Mantener la cancelación de corrutinas y la unicidad de archivos.

## Web

Ver `web/README.md`. Usa Node 22.13+, React/Vinext y Cloudflare Workers.
Comprobar con `node --test tests/*.test.ts`, `npx tsc --noEmit` y `npm run build`
dentro de `web/`. Mantener la validación de destinos públicos, redirecciones,
tipos multimedia y tamaño máximo del HTML.

Cada herramienta es una entrada de `lib/tools.ts`; ese catálogo genera la
navegación, los metadatos, el texto y los enlaces cruzados de cada ruta. Añadir
una herramienta es añadir una entrada, no escribir otra página.

CI (`.github/workflows/web.yml`) ejecuta tests, tipos, lint y build, y despliega
el Worker con `wrangler deploy` cuando existen los secretos `CLOUDFLARE_API_TOKEN`
y `CLOUDFLARE_ACCOUNT_ID`. El Worker se llama `videovault` y necesita el bucket
R2 `videovault-media`: sin él `/api/resolve` falla en cada petición.
