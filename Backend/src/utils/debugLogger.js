import fs from 'fs';
import path from 'path';

export const logError = (error, context = '') => {
    const logPath = path.join(process.cwd(), 'debug_error.log');
    const timestamp = new Date().toISOString();
    const message = `\n[${timestamp}] ${context}\nMessage: ${error.message}\nStack: ${error.stack}\n`;
    fs.appendFileSync(logPath, message);
};
