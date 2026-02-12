const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();

async function run() {
    const RSS_URL = (process.env.RSS_URL || '').trim();
    const DISCORD_WEBHOOK = (process.env.DISCORD_WEBHOOK || '').trim();
    const DATA_FILE = './posted.json';

    if (!RSS_URL) {
        console.error("Error: RSS_URL is missing. Set it in the workflow or as an environment variable.");
        process.exit(1);
    }
    if (!DISCORD_WEBHOOK) {
        console.error("Error: DISCORD_WEBHOOK is missing. Add the secret in the repo: Settings → Secrets and variables → Actions → DISCORD_WEBHOOK.");
        process.exit(1);
    }
    // GitHub never displays secret values when editing; if the run reaches this point, the secret is set.
    const webhookPreview = DISCORD_WEBHOOK.startsWith('https://discord.com/api/webhooks/') ? 'https://discord.com/api/webhooks/***' : '(check that the URL starts with https://discord.com/api/webhooks/)';
    console.log("Webhook configured:", webhookPreview);

    let posted = [];
    if (fs.existsSync(DATA_FILE)) {
        try {
            posted = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            console.log("History loaded with " + posted.length + " items.");
        } catch (e) {
            posted = [];
            console.warn("Failed to parse posted.json, starting with empty history.");
        }
    } else {
        console.log("posted.json not found, starting with empty history.");
    }

    console.log("Checking for updates at: " + RSS_URL);
    try {
        // No CORS proxy needed in Node (e.g. GitHub Actions); direct URL works fine.
        const feed = await parser.parseURL(RSS_URL);

        if (!feed.items || feed.items.length === 0) {
            console.log("Could not retrieve items from the RSS feed or the feed is empty.");
            return;
        }

        // Filter out already posted items and reverse so oldest are posted first.
        const newItems = feed.items.filter(item => !posted.includes(item.link)).reverse();
        console.log(`Found ${newItems.length} new items.`);
        if (newItems.length === 0) {
            console.log("No new items to post. Nothing to send to Discord.");
            return;
        }

        let successCount = 0;
        for (const item of newItems) {
            console.log(`Posting: "${item.title}" (${item.link})`);
            // thread_name is required for Discord Forum channels.
            const threadName = (item.title || 'New post').substring(0, 100);
            const response = await fetch(DISCORD_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    thread_name: threadName,
                    content: `**${item.title}**\n${item.link}`
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`ERROR posting "${item.title}": ${response.status} - ${errorText}`);
                // Don't add to history if posting fails, so it will be retried next run.
            } else {
                console.log(`Posted successfully: "${item.title}"`);
                posted.push(item.link);
                successCount++;
            }
        }

        if (newItems.length > 0 && successCount === 0) {
            console.error("WARNING: Tried to post " + newItems.length + " items but Discord rejected all of them. Check that the webhook URL is correct and the channel still exists.");
        } else {
            console.log("Summary: " + successCount + " of " + newItems.length + " items posted to Discord.");
        }

        // Keep history clean by only storing the last 100 links.
        if (posted.length > 100) {
            posted = posted.slice(-100);
            console.log("History trimmed to the last 100 items.");
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(posted, null, 2));
        console.log("History updated and saved.");

    } catch (e) {
        console.error("Critical error during bot execution:", e.message);
        // On critical error (e.g. RSS unreachable), history is not updated.
    }
}

run().catch((e) => {
    console.error("Unexpected error:", e);
    process.exit(1);
});
