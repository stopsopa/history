import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'http';

// Mock fs to prevent writing to real files
vi.mock('fs', async () => {
    const actual = await vi.importActual('fs');
    return {
        default: {
            ...actual.default,
            existsSync: vi.fn(),
            writeFile: vi.fn((path, data, cb) => cb(null)),
            promises: {
                ...actual.default.promises,
                readFile: vi.fn(),
                writeFile: vi.fn(),
                unlink: vi.fn(),
                mkdir: vi.fn()
            }
        }
    };
});

// Mock imageUtils
vi.mock('../lib/imageUtils.js', () => ({
    processImage: vi.fn().mockResolvedValue('img/test.jpg'),
    ensureDirectoryExists: vi.fn(),
    generateThumbnail: vi.fn(),
    getUniqueFilename: vi.fn().mockResolvedValue('test.jpg')
}));

// Set environment variables before importing server
process.env.HOST = 'localhost';
process.env.PORT = '3000';
process.env.IMAGE_MAX_WIDTH = '1920';
process.env.IMAGE_MAX_HEIGHT = '1080';
process.env.THUMB_SIZE = '24';
process.env.NODE_ENV = 'test';

// Import app and fs after mocking and setting env
const { default: app } = await import('../server.js');
const fs = (await import('fs')).default;

describe('API Endpoints', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        return new Promise((resolve) => {
            // Use port 0 to let OS assign a random available port
            server = app.listen(0, 'localhost', () => {
                const address = server.address();
                baseUrl = `http://localhost:${address.port}`;
                resolve();
            });
        });
    });

    afterAll(() => {
        return new Promise((resolve) => {
            server.close(resolve);
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
        fs.promises.readFile.mockResolvedValue('[]');
        fs.existsSync.mockReturnValue(true);
    });

    test('GET /ping should return pong', async () => {
        const res = await fetch(`${baseUrl}/ping`);
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toBe('pong');
    });

    test('POST /api/events/create should create a new event', async () => {
        const newEvent = {
            title: 'Test Event',
            start: '2023-01-01',
            type: 'point',
            imageSource: 'none'
        };

        const res = await fetch(`${baseUrl}/api/events/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEvent)
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.event.title).toBe('Test Event');
        expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    test('PUT /api/events/:id should update an event', async () => {
        const existingEvents = [{
            id: 123,
            title: 'Old Title',
            start: '2023-01-01'
        }];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(existingEvents));

        const updateData = {
            title: 'New Title',
            start: '2023-01-01',
            imageSource: 'none'
        };

        const res = await fetch(`${baseUrl}/api/events/123`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.event.title).toBe('New Title');
        expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    test('DELETE /api/events/:id should delete an event', async () => {
        const existingEvents = [{
            id: 123,
            title: 'To Delete',
            start: '2023-01-01'
        }];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(existingEvents));

        const res = await fetch(`${baseUrl}/api/events/123`, {
            method: 'DELETE'
        });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(fs.promises.writeFile).toHaveBeenCalled();
        
        const writeCall = fs.promises.writeFile.mock.calls[0];
        const savedData = JSON.parse(writeCall[1]);
        expect(savedData).toHaveLength(0);
    });
});
