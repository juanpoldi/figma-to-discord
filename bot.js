
const fs = require('fs');
const Parser = require('rss-parser');
const parser = new Parser();

async function run() {
    const RSS_URL = process.env.RSS_URL; // Esta URL se inyecta desde el workflow
    const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
    const DATA_FILE = './vistos.json'; // Usamos vistos.json como estándar

    if (!RSS_URL) {
        console.error("Error: Falta RSS_URL en los Secrets o Environment de GitHub.");
        process.exit(1);
    }
    if (!DISCORD_WEBHOOK) {
        console.error("Error: Falta DISCORD_WEBHOOK en los Secrets de GitHub.");
        process.exit(1);
    }

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
            }
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

run();
