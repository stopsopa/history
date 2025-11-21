import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import serveIndex from 'serve-index';
import multer from 'multer';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { processImage } from './lib/imageUtils.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const log = (function(){try{return console.log}catch(e){return function (){}}}());

const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;

const web = path.resolve(__dirname);

const app = express();

app.use(cookieParser());

app.use(express.urlencoded({extended: false}));

app.use(express.json());

// Simple health check endpoint (from existing implementation)
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname)));
app.use(express.json());



app.post("/api/events", (req, res) => {
  const events = req.body;
  fs.writeFile(
    path.join(__dirname, "events.json"),
    JSON.stringify(events, null, 2),
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error saving events");
      } else {
        res.send("Events saved");
      }
    }
  );
});

const upload = multer({ storage: multer.memoryStorage() });

const downloadImage = (url) => {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${res.statusCode}`));
                return;
            }
            const data = [];
            res.on('data', (chunk) => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
    });
};

app.post("/api/events/create", upload.single('imageFile'), async (req, res) => {
    try {
        const { title, start, end, type, imageSource, imageUrl } = req.body;
        
        let imagePath = '';
        
        if (imageSource === 'upload' && req.file) {
            imagePath = await processImage(req.file.buffer, start, title, __dirname);
        } else if (imageSource === 'url' && imageUrl) {
            try {
                const buffer = await downloadImage(imageUrl);
                imagePath = await processImage(buffer, start, title, __dirname);
            } catch (err) {
                console.error("Error downloading image:", err);
                return res.status(400).json({ success: false, error: "Failed to download image from URL. Please check the URL and try again." });
            }
        }
        // If imageSource === 'none', imagePath remains empty

        const newEvent = {
            id: Date.now(),
            content: title,
            start: start,
            end: end || undefined,
            type: type || undefined,
            image: imagePath || undefined
        };

        // Read existing events
        const eventsPath = path.join(__dirname, "events.json");
        let events = [];
        if (fs.existsSync(eventsPath)) {
            const data = await fs.promises.readFile(eventsPath, 'utf8');
            events = JSON.parse(data);
        }

        events.push(newEvent);

        // Save events
        await fs.promises.writeFile(eventsPath, JSON.stringify(events, null, 2));

        res.json({ success: true, event: newEvent });
    } catch (error) {
        console.error("Error creating event:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delay middleware - delays response if ?delay=X query parameter is present
app.use((req, res, next) => {
    const delayParam = req.query.delay;
    if (delayParam) {
        const delayMs = parseInt(delayParam, 10);
        if (!isNaN(delayMs) && delayMs > 0) {
            log(`⏱️  Delaying response for ${delayMs}ms: ${req.path}`);
            setTimeout(next, delayMs);
            return;
        }
    }
    next();
});

app.use((req, res, next) => {
    // Disable caching for all requests
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

app.use(express.static(web, {
    index: false, // stop automatically serve index.html if present
    setHeaders: (res) => {
        // Ensure no-cache headers are set for static files
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
    }
}), serveIndex(web, {
    icons: true,
    view: "details",
    hidden: false,
}));

app.listen(port, host, () => {
    log(`\n 🌎  Server is running http://${host}:${port}\n`);
});
