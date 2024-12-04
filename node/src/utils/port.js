import net from 'net';

class PortUtils {
    /**
     * 检查指定端口是否可用
     * @param {number} port 要检查的端口
     * @returns {Promise<boolean>} 端口是否可用
     */
    static async isPortAvailable(port) {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.once('error', () => {
                resolve(false);  // 端口被占用
            });

            server.once('listening', () => {
                server.close();
                resolve(true);   // 端口可用
            });

            server.listen(port, '127.0.0.1');
        });
    }

    /**
     * 在指定范围内查找第一个可用端口
     * @param {number} startPort 起始端口
     * @param {number} endPort 结束端口
     * @returns {Promise<number>} 找到的可用端口，如果没有则抛出错误
     */
    static async findAvailablePort(startPort, endPort) {
        for (let port = startPort; port <= endPort; port++) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
        }
        throw new Error(`No available port in range ${startPort}-${endPort}`);
    }
}

export default PortUtils; 