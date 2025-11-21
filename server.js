import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import serveIndex from 'serve-index';

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

import fs from "fs";

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
