# AGENTS.md

Instrucciones para agentes de código (OpenAI Codex y similares) en este
repositorio. Equivalente de `CLAUDE.md` para Claude Code: léelo antes de
tocar nada.

## El proyecto, en una línea

VideoVault: app Android (Kotlin + Jetpack Compose, Gradle) para descargar
vídeo, audio e imágenes desde páginas web. Detalle completo en `README.md`.

## Por completar

Este repositorio no tenía `CLAUDE.md`, así que lo de arriba es solo lo que
se puede leer del `README.md`. Lo que falta, y conviene agregar la próxima
vez que se trabaje aquí:

- Cómo compilar y correr las pruebas (`./gradlew test`, `./gradlew build`,
  y lo que haga falta más allá de eso).
- La estructura de `app/` y dónde vive cada capa (UI, descarga, almacenamiento).
- Qué revisa el workflow de CI en `.github/workflows/android.yml` y qué
  tiene que seguir pasando en verde.
- Cualquier decisión de diseño ya tomada que un agente nuevo repetiría por
  error (por ejemplo, por qué es una implementación propia y no un fork).
