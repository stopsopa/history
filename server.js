import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import serveIndex from 'serve-index';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import https from 'https';
import http from 'http';


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

const ensureDirectoryExists = async (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
    }
};

const getUniqueFilename = async (dir, filename) => {
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    let uniqueName = filename;
    let counter = 1;

    while (fs.existsSync(path.join(dir, uniqueName))) {
        uniqueName = `${name}-${counter}${ext}`;
        counter++;
    }
    return uniqueName;
};

const processImage = async (buffer, dateStr, title) => {
    const date = new Date(dateStr);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    // If title is empty or undefined, use 'event' as default base name
    const safeTitle = (title || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    // Construct paths
    const relativeDir = path.join(year, month);
    const imgDir = path.join(__dirname, 'img', relativeDir);
    const thumbDir = path.join(__dirname, 'thumb', relativeDir);
    
    await ensureDirectoryExists(imgDir);
    await ensureDirectoryExists(thumbDir);

    // Base filename: DD-title.jpg
    const day = date.getDate().toString().padStart(2, '0');
    const baseFilename = `${day}-${safeTitle}.jpg`;
    
    // Get unique filename in img dir
    const uniqueFilename = await getUniqueFilename(imgDir, baseFilename);
    
    const imgPath = path.join(imgDir, uniqueFilename);
    const thumbPath = path.join(thumbDir, uniqueFilename);
    
    // Process main image: Convert to JPG, 80% quality
    await sharp(buffer)
        .jpeg({ quality: 80 })
        .toFile(imgPath);
        
    // Process thumbnail: 24x24, cover fit (center crop)
    await sharp(buffer)
        .resize(24, 24, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);
        
    // Return relative path for frontend use (e.g., img/2023/04/20-title.jpg)
    return path.join('img', relativeDir, uniqueFilename);
};

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
            imagePath = await processImage(req.file.buffer, start, title);
        } else if (imageSource === 'url' && imageUrl) {
            try {
                const buffer = await downloadImage(imageUrl);
                imagePath = await processImage(buffer, start, title);
            } catch (err) {
                console.error("Error downloading image:", err);
                return res.status(400).json({ success: false, error: "Failed to download image from URL. Please check the URL and try again." });
            }
        }

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
