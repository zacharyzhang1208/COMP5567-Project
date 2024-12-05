import net from 'net';
import fs from 'fs';
import path from 'path';

class PortUtils {
    static LOCKS_DIR = path.join(process.cwd(), '.locks');
    static lockedPorts = new Set();

    static ensureLocksDir() {
        if (!fs.existsSync(this.LOCKS_DIR)) {
            fs.mkdirSync(this.LOCKS_DIR, { recursive: true });
            console.log('[Port] Created locks directory');
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
            console.log(`[Port] Port ${port} is locked`);
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
        console.log(`[Port] Searching for available port in range ${startPort}-${endPort}`);
        
        for (let port = startPort; port <= endPort; port++) {
            if (await this.isPortAvailable(port)) {
                console.log(`[Port] Found available port: ${port}`);
                return port;
            }
        }
        
        throw new Error(`No available port in range ${startPort}-${endPort}`);
    }

    static cleanupLocks() {
        for (const port of this.lockedPorts) {
            try {
                this.unlockPort(port);
                console.log(`[Port] Cleaned up lock for port ${port}`);
            } catch (err) {
                console.error(`[Port] Error cleaning up lock for port ${port}:`, err);
            }
        }
        this.lockedPorts.clear();

        try {
            fs.rmdirSync(this.LOCKS_DIR);
            console.log('[Port] Removed empty locks directory');
        } catch (err) {
            // Ignore the directory not empty or not exist error
        }
    }
}

/**
 * Process Exit Handlers
 * 
 * We need to handle different types of process termination to ensure proper cleanup:
 * 
 * 1. 'exit': Normal process exit
 *    - Emitted when process is about to exit
 *    - Only synchronous operations allowed
 *    - Last chance for cleanup
 * 
 * 2. 'SIGINT': Interrupt signal
 *    - Typically triggered by Ctrl+C
 *    - Allows async operations
 *    - Must call process.exit() manually
 * 
 * 3. 'SIGTERM': Termination signal
 *    - External termination request
 *    - Common in development (nodemon) and production (Docker)
 *    - Allows async operations
 *    - Must call process.exit() manually
 */

process.on('exit', () => {
    PortUtils.cleanupLocks();
});

process.on('SIGINT', () => {
    PortUtils.cleanupLocks();
    process.exit();
});

process.on('SIGTERM', () => {
    PortUtils.cleanupLocks();
    process.exit();
});

export default PortUtils; 