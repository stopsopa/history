import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const imgRoot = path.join(projectRoot, 'img');
const thumbRoot = path.join(projectRoot, 'thumb');

const ensureDirectoryExists = async (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
    }
};

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
    const jpgFiles = files.filter(file => file.toLowerCase().endsWith('.jpg'));

    console.log(`Found ${jpgFiles.length} images.`);

    for (const file of jpgFiles) {
        const relativePath = path.relative(imgRoot, file);
        const thumbPath = path.join(thumbRoot, relativePath);
        const thumbDir = path.dirname(thumbPath);

        await ensureDirectoryExists(thumbDir);

        try {
            await sharp(file)
                .resize(24, 24, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toFile(thumbPath);
            
            console.log(`Generated: ${relativePath}`);
        } catch (err) {
            console.error(`Error processing ${relativePath}:`, err);
        }
    }

    console.log('Thumbnail regeneration complete.');
}

regenerateThumbnails();
