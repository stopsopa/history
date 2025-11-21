import { describe, test, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverPath = path.join(__dirname, '../server.js');

describe('Environment Variable Validation', () => {
    const defaultEnv = {
        ...process.env,
        HOST: 'localhost',
        PORT: '3000',
        IMAGE_MAX_WIDTH: '1920',
        IMAGE_MAX_HEIGHT: '1080',
        THUMB_SIZE: '24',
        NODE_ENV: 'test'
    };

    function runServer(env) {
        return new Promise((resolve) => {
            const serverProcess = spawn('node', [serverPath], {
                env: env,
                stdio: 'pipe'
            });

            let stderr = '';

            serverProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            serverProcess.on('close', (code) => {
                resolve({ code, stderr });
            });
            
            // Kill process after a short time if it doesn't exit (meaning it started successfully)
            setTimeout(() => {
                serverProcess.kill();
                resolve({ code: null, stderr }); // null code means it was running
            }, 2000);
        });
    }

    test('should fail if HOST is missing', async () => {
        const env = { ...defaultEnv };
        delete env.HOST;
        const result = await runServer(env);
        expect(result.stderr).toContain('Environment variable HOST is missing');
        expect(result.code).not.toBe(0);
    }, 10000);

    test('should fail if PORT is missing', async () => {
        const env = { ...defaultEnv };
        delete env.PORT;
        const result = await runServer(env);
        expect(result.stderr).toContain('Environment variable PORT is missing');
        expect(result.code).not.toBe(0);
    }, 10000);

    test('should fail if PORT is invalid', async () => {
        const env = { ...defaultEnv, PORT: 'abc' };
        const result = await runServer(env);
        expect(result.stderr).toContain('Environment variable PORT must be a positive integer');
        expect(result.code).not.toBe(0);
    }, 10000);

    test('should fail if IMAGE_MAX_WIDTH is missing', async () => {
        const env = { ...defaultEnv };
        delete env.IMAGE_MAX_WIDTH;
        const result = await runServer(env);
        // Note: The error comes from lib/imageUtils.js which is imported by server.js
        expect(result.stderr).toContain('Environment variable IMAGE_MAX_WIDTH is missing');
        expect(result.code).not.toBe(0);
    }, 10000);

    test('should fail if THUMB_SIZE is invalid', async () => {
        const env = { ...defaultEnv, THUMB_SIZE: '0' };
        const result = await runServer(env);
        expect(result.stderr).toContain('Environment variable THUMB_SIZE must be a positive integer');
        expect(result.code).not.toBe(0);
    }, 10000);
});
