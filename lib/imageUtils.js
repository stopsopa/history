import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    await sharp(buffer)
        .resize(24, 24, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
};

export const processImage = async (buffer, dateStr, title, projectRoot) => {
    const date = new Date(dateStr);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const safeTitle = (title || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const relativeDir = path.join(year, month);
    const imgDir = path.join(projectRoot, 'img', relativeDir);
    const thumbDir = path.join(projectRoot, 'thumb', relativeDir);
    
    await ensureDirectoryExists(imgDir);
    await ensureDirectoryExists(thumbDir);

    const day = date.getDate().toString().padStart(2, '0');
    const baseFilename = `${day}-${safeTitle}.jpg`;
    
    const uniqueFilename = await getUniqueFilename(imgDir, baseFilename);
    
    const imgPath = path.join(imgDir, uniqueFilename);
    const thumbPath = path.join(thumbDir, uniqueFilename);
    
    // Process main image: Convert to JPG, 80% quality
    await sharp(buffer)
        .jpeg({ quality: 80 })
        .toFile(imgPath);
        
    // Process thumbnail
    await generateThumbnail(buffer, thumbPath);
        
    return path.join('img', relativeDir, uniqueFilename);
};
