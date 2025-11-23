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

const host = process.env.HOST;
if (!host) {
    throw new Error('Environment variable HOST is missing or empty');
}

const portStr = process.env.PORT;
if (!portStr) {
    throw new Error('Environment variable PORT is missing');
}
const port = parseInt(portStr, 10);
if (isNaN(port) || port <= 0) {
    throw new Error(`Environment variable PORT must be a positive integer, got: ${portStr}`);
}

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
        const { title, start, end, type, imageSource, imageUrl, group, color } = req.body;
        
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

        // Parse group field if present
        let groupArray = undefined;
        if (group) {
            try {
                groupArray = JSON.parse(group);
            } catch (e) {
                // If parsing fails, ignore the group field
                console.error("Error parsing group field:", e);
            }
        }

        const newEvent = {
            id: Date.now(),
            title: title,
            content: req.body.content || '',
            start: start,
            end: end || undefined,
            type: type || undefined,
            image: imagePath || undefined,
            group: groupArray,
            color: color || undefined
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

app.put("/api/events/:id", upload.single('imageFile'), async (req, res) => {
    try {
        const eventId = parseInt(req.params.id, 10);
        const { title, start, end, type, imageSource, imageUrl, group, color } = req.body;
        
        const eventsPath = path.join(__dirname, "events.json");
        let events = [];
        try {
            const data = await fs.promises.readFile(eventsPath, 'utf8');
            events = JSON.parse(data);
        } catch (err) {
            return res.status(404).json({ success: false, error: "Events file not found" });
        }

        const eventIndex = events.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            return res.status(404).json({ success: false, error: "Event not found" });
        }

        const existingEvent = events[eventIndex];
        let imagePath = existingEvent.image; // Default to keeping existing image

        // Handle image updates
        if (imageSource === 'none') {
            // Remove image if it exists
            if (existingEvent.image && existingEvent.image.startsWith('img/')) {
                try {
                    await fs.promises.unlink(path.join(__dirname, existingEvent.image));
                } catch (e) { console.log('Error deleting old image:', e.message); }
            }
            imagePath = undefined;
        } else if (imageSource === 'upload' && req.file) {
            // Delete old image if exists
            if (existingEvent.image && existingEvent.image.startsWith('img/')) {
                try {
                    await fs.promises.unlink(path.join(__dirname, existingEvent.image));
                } catch (e) { console.log('Error deleting old image:', e.message); }
            }
            imagePath = await processImage(req.file.buffer, start, title, __dirname);
        } else if (imageSource === 'url' && imageUrl) {
             // Delete old image if exists
             if (existingEvent.image && existingEvent.image.startsWith('img/')) {
                try {
                    await fs.promises.unlink(path.join(__dirname, existingEvent.image));
                } catch (e) { console.log('Error deleting old image:', e.message); }
            }
            try {
                const buffer = await downloadImage(imageUrl);
                imagePath = await processImage(buffer, start, title, __dirname);
            } catch (err) {
                console.error("Error downloading image:", err);
                return res.status(400).json({ success: false, error: "Failed to download image from URL." });
            }
        }
        // If imageSource === 'keep', imagePath remains as existingEvent.image

        // Parse group field if present
        let groupArray = undefined;
        if (group) {
            try {
                groupArray = JSON.parse(group);
            } catch (e) {
                // If parsing fails, keep existing group or set to undefined
                console.error("Error parsing group field:", e);
                groupArray = existingEvent.group;
            }
        }

        // Update event fields
        events[eventIndex] = {
            ...existingEvent,
            title: title,
            content: req.body.content || '',
            start: start,
            end: end || undefined,
            type: type || undefined,
            image: imagePath,
            group: groupArray,
            color: color || undefined
        };

        // Save events
        await fs.promises.writeFile(eventsPath, JSON.stringify(events, null, 2));

        res.json({ success: true, event: events[eventIndex] });
    } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({ success: false, error: error.message });
    }


});

app.post("/api/upload", upload.single('imageFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: "No file uploaded" });
        }
        
        const title = req.body.title || 'upload';
        const start = req.body.start || new Date().toISOString().split('T')[0];
        
        const imagePath = await processImage(req.file.buffer, start, title, __dirname);
        
        res.json({ success: true, imagePath: imagePath });
    } catch (error) {
        console.error("Error uploading image:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete event endpoint
app.delete("/api/events/:id", async (req, res) => {
    try {
        const eventId = parseInt(req.params.id, 10);
        const eventsPath = path.join(__dirname, "events.json");
        
        // Read existing events
        let events = [];
        try {
            const data = await fs.promises.readFile(eventsPath, "utf8");
            events = JSON.parse(data);
        } catch (err) {
            return res.status(404).json({ success: false, error: "Events file not found" });
        }
        
        // Find the event to delete
        const eventIndex = events.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            return res.status(404).json({ success: false, error: "Event not found" });
        }
        
        const eventToDelete = events[eventIndex];
        
        // Delete associated image file if it exists and is in img/ directory
        if (eventToDelete.image && eventToDelete.image.startsWith('img/')) {
            const imagePath = path.join(__dirname, eventToDelete.image);
            try {
                await fs.promises.unlink(imagePath);
                console.log(`Deleted image: ${imagePath}`);
            } catch (err) {
                console.log(`Could not delete image ${imagePath}:`, err.message);
            }
        }
        
        // Remove event from array
        events.splice(eventIndex, 1);
        
        // Save updated events
        await fs.promises.writeFile(eventsPath, JSON.stringify(events, null, 2));
        
        res.json({ success: true, message: "Event deleted successfully" });
    } catch (error) {
        console.error("Error deleting event:", error);
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
    if (req.path.startsWith('/img/') || req.path.startsWith('/thumb/')) {
        next();
        return;
    }
    // Disable caching for all requests
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

app.use(express.static(web, {
    index: false, // stop automatically serve index.html if present
    setHeaders: (res, filePath) => {
        if (filePath.includes('/img/') || filePath.includes('/thumb/')) {
            res.set('Cache-Control', 'public, max-age=315360000, immutable');
            res.set('Expires', new Date(Date.now() + 315360000000).toUTCString());
        } else {
            // Ensure no-cache headers are set for static files
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.set('Pragma', 'no-cache');
            res.set('Expires', '0');
        }
    }
}), serveIndex(web, {
    icons: true,
    view: "details",
    hidden: false,
}));

if (process.env.NODE_ENV !== 'test') {
    app.listen(port, host, () => {
        const startTime = (new Date()).toISOString().substring(0, 19).replace('T', ' ')
        log(`\n 🌎  Server is running http://${host}:${port}`);
        log(`\n     also http://${host}:${port}/custom.html - for version working with events.json`);
        log(`\n ⏰  Started at: ${startTime}\n`);
    });
}

export default app;
