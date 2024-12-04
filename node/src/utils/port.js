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
     * 检查指定端口是否可用
     */
    static async isPortAvailable(port) {
        // 1. 检查锁文件
        if (!await this.lockPort(port)) {
            console.log(`[Port] Port ${port} is locked`);
            return false;
        }

        // 2. 简单的端口检测
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
            // 忽略目录不为空或不存在的错误
        }
    }
}

// 进程退出处理
process.on('exit', () => PortUtils.cleanupLocks());
process.on('SIGINT', () => {
    PortUtils.cleanupLocks();
    process.exit();
});
process.on('SIGTERM', () => {
    PortUtils.cleanupLocks();
    process.exit();
});

export default PortUtils; 