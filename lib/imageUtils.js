import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate environment variables
const requiredEnvVars = ['IMAGE_MAX_WIDTH', 'IMAGE_MAX_HEIGHT', 'THUMB_SIZE'];
for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value) {
        throw new Error(`Environment variable ${envVar} is missing`);
    }
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) {
        throw new Error(`Environment variable ${envVar} must be a positive integer, got: ${value}`);
    }
}
export const ensureDirectoryExists = async (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
    }
};

export const getUniqueFilename = async (dir, filename) => {
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

export const generateThumbnail = async (buffer, outputPath) => {
    const size = parseInt(process.env.THUMB_SIZE || '24', 10);
    await sharp(buffer)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
};

export const processImage = async (buffer, dateStr, title, projectRoot) => {
    // Parse date manually to handle BC dates (negative years)
    // Format: YYYY-MM-DD or -YYYY-MM-DD for BC dates
    const match = dateStr.match(/^(-?\d+)-(\d+)-(\d+)/);
    if (!match) {
        throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD or -YYYY-MM-DD`);
    }
    
    const year = match[1]; // Keep as string, can be negative
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    const safeTitle = (title || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const relativeDir = path.join(year, month);
    const imgDir = path.join(projectRoot, 'img', relativeDir);
    const thumbDir = path.join(projectRoot, 'thumb', relativeDir);
    
    await ensureDirectoryExists(imgDir);
    await ensureDirectoryExists(thumbDir);

    const baseFilename = `${day}-${safeTitle}.jpg`;
    
    const uniqueFilename = await getUniqueFilename(imgDir, baseFilename);
    
    const imgPath = path.join(imgDir, uniqueFilename);
    const thumbPath = path.join(thumbDir, uniqueFilename);
    
    // Process main image: Convert to JPG, 80% quality, resize if needed
    const maxWidth = parseInt(process.env.IMAGE_MAX_WIDTH || '1920', 10);
    const maxHeight = parseInt(process.env.IMAGE_MAX_HEIGHT || '1080', 10);

    await sharp(buffer)
        .resize({
            width: maxWidth,
            height: maxHeight,
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(imgPath);
        
    // Process thumbnail
    await generateThumbnail(buffer, thumbPath);
        
    return path.join('img', relativeDir, uniqueFilename);
};
