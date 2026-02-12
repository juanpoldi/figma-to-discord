# figma-to-discord

Bot that reads Figma's RSS feed (release notes) and posts new entries to a Discord channel via webhook. Runs on GitHub Actions (daily cron or manual trigger).

## What it does

1. Fetches the configured RSS feed (default: Figma release notes in Spanish).
2. Compares entries against a local history file (`posted.json`) to avoid duplicate posts.
3. For each new entry, sends a message to the Discord webhook (title + link).
4. If the Discord channel is a **Forum**, it creates a new thread per entry using the title as the thread name.
5. Updates the history and commits it back to the repository for the next run.

## Requirements

- Node.js 20+
- GitHub account (for Actions)
- A Discord webhook on the channel where you want to receive the news

## GitHub setup

1. **Webhook secret**  
   In the repo: **Settings** → **Secrets and variables** → **Actions** → create or edit the secret **DISCORD_WEBHOOK** with the Discord webhook URL (Channel settings → Integrations → Webhooks → Copy URL).

2. **RSS URL**  
   By default the workflow uses Figma's feed (es-la). To change the feed, edit the `RSS_URL` variable in [.github/workflows/rss.yml](.github/workflows/rss.yml).

## Running

- **Automatic:** once a day at 8:00 UTC (cron in the workflow).
- **Manual:** on GitHub, go to **Actions** → **RSS Auto-Poster** → **Run workflow**.

## Local run (optional)

```bash
npm install
RSS_URL="https://www.figma.com/es-la/release-notes/feed/atom.xml" \
DISCORD_WEBHOOK="https://discord.com/api/webhooks/..." \
node bot.js
```

## Project structure

| File | Description |
|------|-------------|
| `bot.js` | Main logic: reads RSS, filters by history, posts to Discord. |
| `posted.json` | List of already posted links (updated on each run). |
| `.github/workflows/rss.yml` | GitHub Actions workflow (cron + manual). |

## Discord Forum channels

If the webhook points to a **Forum channel**, the bot sends each entry with a `thread_name` to create one thread per post. No extra configuration needed.

## License

ISC
