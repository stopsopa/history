import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDirectoryExists, generateThumbnail } from '../lib/imageUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const imgRoot = path.join(projectRoot, 'img');
const thumbRoot = path.join(projectRoot, 'thumb');

async function getFiles(dir) {
    const subdirs = await fs.promises.readdir(dir);
    const files = await Promise.all(subdirs.map(async (subdir) => {
        const res = path.resolve(dir, subdir);
        return (await fs.promises.stat(res)).isDirectory() ? getFiles(res) : res;
    }));
    return files.flat();
}

async function regenerateThumbnails() {
    console.log('Starting thumbnail regeneration...');

    if (!fs.existsSync(imgRoot)) {
        console.log('No img directory found.');
        return;
    }

    const files = await getFiles(imgRoot);
    const jpgFiles = files.filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.png'));

    console.log(`Found ${jpgFiles.length} images.`);

    for (const file of jpgFiles) {
        const relativePath = path.relative(imgRoot, file);
        const thumbPath = path.join(thumbRoot, relativePath).replace(/\.(png|jpg)$/i, '.jpg');
        const thumbDir = path.dirname(thumbPath);

        await ensureDirectoryExists(thumbDir);

        try {
            const buffer = await fs.promises.readFile(file);
            await generateThumbnail(buffer, thumbPath);
            
            console.log(`Generated: ${relativePath}`);
        } catch (err) {
            console.error(`Error processing ${relativePath}:`, err);
        }
    }

    console.log('Thumbnail regeneration complete.');
}

regenerateThumbnails();

