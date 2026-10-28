# VideoVault

[![Android CI](https://github.com/ianmusicall-max/Mac-de-Jose/actions/workflows/android.yml/badge.svg)](https://github.com/ianmusicall-max/Mac-de-Jose/actions/workflows/android.yml)

Aplicación Android para descargar vídeo, audio e imágenes desde páginas web:
pega un enlace, navega con el navegador integrado o comparte una URL desde otra
app, y VideoVault encuentra el archivo, lo descarga y lo deja en la galería.

Es una implementación propia (código, nombre e iconos originales) del tipo de
app "video downloader" que se encuentra en Play Store, escrita desde cero con
Kotlin y Jetpack Compose.

## Funciones

| Pantalla | Qué hace |
| --- | --- |
| **Link** | Campo para pegar una URL, detección automática del enlace que haya en el portapapeles, lista de calidades encontradas e historial de enlaces recientes. |
| **Browser** | Navegador integrado (WebView) que detecta el vídeo de la página de dos formas: leyendo el DOM con un script inyectado y observando las peticiones de red que parecen media. Botón flotante con el número de archivos encontrados, modo escritorio y "deep scan" del servidor. |
| **Downloads** | Cola con progreso, pausa/reanudar, reintento y cancelación; lista de descargas terminadas con reproductor integrado (Media3), compartir y borrar. |
| **Statuses** | Guardado de estados: eliges una vez la carpeta con el selector del sistema y desde ahí copias fotos y vídeos a tu galería. |
| **Settings** | Tema claro/oscuro/sistema, colores dinámicos, solo Wi-Fi, descargas en paralelo (1–4), publicar en galería, aviso de portapapeles, notificación de progreso y limpieza de historial y datos del navegador. |

Además: destino del *share sheet* (`text/plain`), servicio en primer plano con
notificación de progreso, y reanudación por rangos HTTP tras cerrar la app.

## Cómo encuentra el vídeo

La extracción es genérica, no específica de ninguna plataforma. `MediaResolverChain`
prueba en orden:

1. **`HlsResolver`** – si la URL es un `.m3u8`, expande el *master playlist* en una
   opción por calidad (`RESOLUTION`/`BANDWIDTH`).
2. **`DirectLinkResolver`** – la URL ya apunta a un archivo (`.mp4`, `.webm`, …);
   confirma tipo y tamaño con `HEAD` o un `GET` de un byte.
3. **`HtmlMediaResolver`** – descarga la página y lee lo que ella misma publica:
   etiquetas OpenGraph (`og:video`), `twitter:player:stream`, elementos
   `<video>`/`<source>`/`<audio>`, `contentUrl` de JSON-LD y URLs de media en
   scripts en línea.

Para añadir una estrategia nueva basta implementar `MediaResolver` y añadirla a
la cadena.

Las descargas HLS se guardan concatenando los segmentos en un único archivo, sin
dependencias nativas. **Los streams cifrados (`#EXT-X-KEY`) no se descargan**: la
app informa y se detiene, no evita protecciones de contenido.

## Arquitectura

```
ui/            Compose: home, browser, downloads, statuses, settings, player
resolver/      MediaResolver + implementaciones, modelos y utilidades de URL
download/      DownloadEngine (cola), Downloader, HlsDownloader, FileStore,
               DownloadService (primer plano) y notificaciones
data/db/       Room: descargas e historial de enlaces
data/prefs/    DataStore: ajustes
statuses/      Lectura de la carpeta de estados vía SAF/DocumentFile
AppContainer   Grafo de dependencias hecho a mano (sin framework de DI)
```

Estado unidireccional: la UI pide al `MediaRepository`, el motor escribe el
progreso en Room y las pantallas lo observan. Las descargas van a almacenamiento
privado de la app y se copian a `MediaStore` al terminar, así que no se necesita
permiso de escritura en Android 10+.

## Compilar

Requiere el Android SDK (API 36) y JDK 17+.

```bash
# local.properties
sdk.dir=/ruta/a/tu/Android/sdk

./gradlew assembleDebug        # APK de depuración
./gradlew test                 # tests unitarios (resolver y utilidades de URL)
./gradlew installDebug         # instalar en un dispositivo conectado
```

### Sin instalar nada: descargar el APK de GitHub

Cada push a cualquier rama lanza el workflow `Android CI`, que ejecuta los tests
y compila el APK de depuración. Para bajarlo:

1. Pestaña **Actions** del repositorio → run más reciente de *Android CI*.
2. Abajo, en **Artifacts**, descarga `videovault-debug-apk` (es un `.zip`).
3. Descomprime y abre `app-debug.apk` en el móvil. Android pedirá permitir la
   instalación desde la app con la que lo abras (Archivos, Drive, Chrome…).

## Versiones

Kotlin 2.1.21 · AGP 8.10.1 · Gradle 8.14.3 · compileSdk 36 · minSdk 24 ·
Compose BOM 2025.06.00 · Room 2.7.1 · Media3 1.7.1 · OkHttp 4.12 · jsoup 1.20.1

## Uso responsable

Descarga solo material propio o para el que tengas permiso, y respeta los
términos de servicio de cada sitio y los derechos de autor del contenido. La app
no incluye ningún mecanismo para saltarse protecciones de contenido ni accesos de
pago.
