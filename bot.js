const fs = require('fs');

async function run() {
    const RSS_URL = process.env.RSS_URL || 'https://www.figma.com/es-es/release-notes/feed/atom.xml';
    const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
    const DATA_FILE = './vistos.json';

    if (!DISCORD_WEBHOOK) {
        console.error("Error: Falta DISCORD_WEBHOOK en los Secrets de GitHub.");
        process.exit(1);
    }

    let vistos = [];
    if (fs.existsSync(DATA_FILE)) {
        try { vistos = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) { vistos = []; }
    }

    console.log("Comprobando actualizaciones...");
    try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(RSS_URL)}`);
        const data = await response.json();
        
        if (!data.items) {
            console.log("No se pudieron obtener items del RSS.");
            return;
        }

        const nuevas = data.items.filter(item => !vistos.includes(item.link)).reverse();
        console.log(`Encontradas ${nuevas.length} noticias nuevas.`);

        for (const noticia of nuevas) {
            console.log(`Publicando: ${noticia.title}`);
            await fetch(DISCORD_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `**${noticia.title}**\n${noticia.link}`
                })
            });
            vistos.push(noticia.link);
        }

        if (vistos.length > 100) vistos = vistos.slice(-100);
        fs.writeFileSync(DATA_FILE, JSON.stringify(vistos, null, 2));
        console.log("Historial actualizado correctamente.");
        
    } catch (e) {
        console.error("Error crítico durante la ejecución:", e.message);
    }
}

run();
