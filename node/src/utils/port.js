import net from 'net';
import fs from 'fs';
import path from 'path';
import Logger from './logger.js';

class PortUtils {
    static LOCKS_DIR = path.join(process.cwd(), '.locks');
    static lockedPorts = new Set();
    static logger = new Logger('Port');

    static ensureLocksDir() {
        if (!fs.existsSync(this.LOCKS_DIR)) {
            fs.mkdirSync(this.LOCKS_DIR, { recursive: true });
            this.logger.info('Created locks directory');
        }
    }

    static getLockFilePath(port) {
        return path.join(this.LOCKS_DIR, `port-${port}.lock`);
    }

    static async lockPort(port) {
        this.ensureLocksDir();
        try {
            fs.writeFileSync(this.getLockFilePath(port), process.pid.toString(), { flag: 'wx' });
            this.lockedPorts.add(port);
            return true;
        } catch (err) {
            if (err.code === 'EEXIST') {
                return false;
            }
            throw err;
        }
    }

    static unlockPort(port) {
        try {
            fs.unlinkSync(this.getLockFilePath(port));
            this.lockedPorts.delete(port);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }

    /**
     * Check if the specified port is available
     */
    static async isPortAvailable(port) {
        // 1. Check the lock file
        if (!await this.lockPort(port)) {
            this.logger.debug(`Port ${port} is locked`);
            return false;
        }

        // 2. Simple port check
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.once('error', () => {
                this.unlockPort(port);
                resolve(false);
            });

            server.once('listening', () => {
                server.close(() => {
                    resolve(true);
                });
            });

            server.listen(port, '127.0.0.1');
        });
    }

    static async findAvailablePort(startPort, endPort) {
        this.logger.info(`Searching for available port in range ${startPort}-${endPort}`);
        
        for (let port = startPort; port <= endPort; port++) {
            if (await this.isPortAvailable(port)) {
                this.logger.info(`Found available port: ${port}`);
                return port;
            }
        }
        
        throw new Error(`No available port in range ${startPort}-${endPort}`);
    }

    static cleanupLocks() {
        for (const port of this.lockedPorts) {
            try {
                this.unlockPort(port);
                this.logger.debug(`Cleaned up lock for port ${port}`);
            } catch (err) {
                this.logger.error(`Error cleaning up lock for port ${port}:`, err);
            }
        }
        this.lockedPorts.clear();

        try {
            fs.rmdirSync(this.LOCKS_DIR);
            this.logger.debug('Removed empty locks directory');
        } catch (err) {
            // Ignore the directory not empty or not exist error
        }
    }
}

/**
 * Process Exit Handlers
 */

// 只在进程真正退出时清理
process.on('exit', () => {
    console.log('\n[Port] Cleaning up port locks...');
    PortUtils.cleanupLocks();
});

export default PortUtils; 