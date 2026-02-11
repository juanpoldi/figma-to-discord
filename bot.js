
const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();

async function run() {
    const RSS_URL = (process.env.RSS_URL || '').trim();
    const DISCORD_WEBHOOK = (process.env.DISCORD_WEBHOOK || '').trim();
    const DATA_FILE = './vistos.json'; // Usamos vistos.json como estándar

    if (!RSS_URL) {
        console.error("Error: Falta RSS_URL en los Secrets o Environment de GitHub.");
        process.exit(1);
    }
    if (!DISCORD_WEBHOOK) {
        console.error("Error: Falta DISCORD_WEBHOOK. Añade el secret en el repo: Settings → Secrets and variables → Actions → DISCORD_WEBHOOK.");
        process.exit(1);
    }
    // En GitHub el valor del secret no se muestra al editarlo; si el run llega aquí, está configurado.
    const webhookPreview = DISCORD_WEBHOOK.startsWith('https://discord.com/api/webhooks/') ? 'https://discord.com/api/webhooks/***' : '(comprueba que la URL empiece por https://discord.com/api/webhooks/)';
    console.log("Webhook configurado:", webhookPreview);

    let vistos = [];
    if (fs.existsSync(DATA_FILE)) {
        try { 
            vistos = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); 
            console.log("Historial cargado con " + vistos.length + " ítems.");
        } catch(e) { 
            vistos = [];
            console.warn("Error al parsear vistos.json, iniciando con historial vacío.");
        }
    } else {
        console.log("No se encontró vistos.json, iniciando con historial vacío.");
    }

    console.log("Comprobando actualizaciones en: " + RSS_URL);
    try {
        // En Node (p. ej. GitHub Actions) no aplica CORS; el proxy daba 403 con Figma, así que usamos la URL directa.
        const feed = await parser.parseURL(RSS_URL);
        
        if (!feed.items || feed.items.length === 0) {
            console.log("No se pudieron obtener ítems del RSS o el feed está vacío.");
            return;
        }

        // Filtramos las noticias que no hemos visto, y las ordenamos de más antigua a más nueva para publicar en orden.
        const nuevas = feed.items.filter(item => !vistos.includes(item.link)).reverse();
        console.log(`Encontradas ${nuevas.length} noticias nuevas.`);
        if (nuevas.length === 0) {
            console.log("No hay noticias nuevas para publicar. Nada que enviar a Discord.");
            return;
        }

        let publicadas = 0;
        for (const noticia of nuevas) {
            console.log(`Intentando publicar: "${noticia.title}" (${noticia.link})`);
            const response = await fetch(DISCORD_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `**${noticia.title}**\n${noticia.link}`
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`ERROR al publicar "${noticia.title}": ${response.status} - ${errorText}`);
                // No añadimos al historial si la publicación falla, para reintentar más tarde.
            } else {
                console.log(`Publicado con éxito: "${noticia.title}"`);
                vistos.push(noticia.link);
                publicadas++;
            }
        }

        if (nuevas.length > 0 && publicadas === 0) {
            console.error("AVISO: Se intentaron publicar " + nuevas.length + " noticias pero Discord rechazó todas. Comprueba que la URL del webhook sea correcta y que el canal siga existiendo.");
        } else {
            console.log("Resumen: " + publicadas + " de " + nuevas.length + " noticias publicadas en Discord.");
        }

        // Mantenemos el historial limpio, guardando solo los últimos 100 enlaces.
        if (vistos.length > 100) {
            vistos = vistos.slice(-100);
            console.log("Historial podado a los últimos 100 ítems.");
        }
        
        fs.writeFileSync(DATA_FILE, JSON.stringify(vistos, null, 2));
        console.log("Historial actualizado y guardado correctamente.");
        
    } catch (e) {
        console.error("Error crítico durante la ejecución del bot:", e.message);
        // Si hay un error crítico (ej. RSS no accesible), no se actualizará el historial.
    }
}

run().catch((e) => {
    console.error("Error inesperado:", e);
    process.exit(1);
});
