# mi-bot-rss

Bot que lee un feed RSS y publica las noticias nuevas en un canal de Discord mediante un webhook. Pensado para ejecutarse en GitHub Actions (cron diario o manual).

## Qué hace

1. Descarga el feed RSS configurado (por defecto: notas de la versión de Figma en español).
2. Compara las entradas con un historial local (`vistos.json`) para no repetir publicaciones.
3. Por cada noticia nueva, envía un mensaje al webhook de Discord (título + enlace).
4. Si el canal es un **Foro** de Discord, crea un hilo por noticia con el título como nombre del hilo.
5. Actualiza el historial y lo guarda en el repositorio para la siguiente ejecución.

## Requisitos

- Node.js 20+
- Cuenta en GitHub (para Actions)
- Un webhook de Discord en el canal donde quieras recibir las noticias

## Configuración en GitHub

1. **Secret del webhook**  
   En el repo: **Settings** → **Secrets and variables** → **Actions** → crea o edita el secret **DISCORD_WEBHOOK** con la URL del webhook de Discord (Config del canal → Integraciones → Webhooks → Copiar URL).

2. **URL del RSS**  
   Por defecto el workflow usa el feed de Figma (es-la). Para cambiar de feed, edita la variable `RSS_URL` en [.github/workflows/rss.yml](.github/workflows/rss.yml).

## Ejecución

- **Automática:** una vez al día a las 8:00 UTC (cron en el workflow).
- **Manual:** en GitHub, pestaña **Actions** → **RSS Auto-Poster** → **Run workflow**.

## Ejecución local (opcional)

```bash
npm install
RSS_URL="https://www.figma.com/es-la/release-notes/feed/atom.xml" \
DISCORD_WEBHOOK="https://discord.com/api/webhooks/..." \
node bot.js
```

## Estructura del proyecto

| Archivo | Descripción |
|---------|-------------|
| `bot.js` | Lógica principal: lee RSS, filtra por historial, publica en Discord. |
| `vistos.json` | Lista de enlaces ya publicados (se actualiza en cada run). |
| `.github/workflows/rss.yml` | Workflow de GitHub Actions (cron + manual). |

## Canal tipo Foro en Discord

Si el webhook apunta a un **canal Foro**, el bot envía cada noticia con `thread_name` para crear un hilo por entrada. No hace falta configuración extra.

## Licencia

ISC
