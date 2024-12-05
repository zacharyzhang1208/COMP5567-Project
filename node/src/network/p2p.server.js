import { WebSocketServer, WebSocket } from 'ws';
import { MESSAGE_TYPES } from './message.handler.js';
import PortUtils from '../utils/port.js';
import { envConfig } from '../../config/env.config.js';
import Logger from '../utils/logger.js';
import NetworkUtils from '../utils/network.js';

class P2PServer {
    constructor(node) {
        this.node = node;
        this.port = null;
        this.logger = new Logger('P2P');
        this.host = NetworkUtils.getLocalIP();
    }

    async initialize() {
        this.logger.info('Initializing P2P server...');
        this.logger.info(`Local IP address: ${this.host}`);
        // 获取可用端口
        const networkConfig = envConfig.getNetworkConfig();
        const { start, end } = networkConfig.portRange;
        
        this.port = await PortUtils.findAvailablePort(start, end);
        this.node.port = this.port;

        // 启动服务器
        await this.start();
        this.logger.info(`P2P server started on port ${this.port}`);
        this.logger.info('Server is ready');

        // 等待一段时间确保服务器完全就绪
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 连接到网络
        await this.connectToNetwork();
        this.logger.info('Network discovery completed');
    }

    async start() {
        const server = new WebSocketServer({ port: this.port });
        this.server = server;
        
        server.on('connection', socket => {
            this.logger.info('New peer connected');
            this.node.peers.add(socket);
            socket.on('message', message => {
                this.node.messageHandler.handleMessage(JSON.parse(message), socket);
            });
            socket.on('close', () => {
                this.node.peers.delete(socket);
                this.logger.info('Peer disconnected');
            });
            socket.on('error', error => {
                this.logger.error('WebSocket error:', error);
            });
        });

        await this.waitForReady();
    }

    async connectToNetwork() {
        this.logger.info('Starting network discovery...');
        
        // 获取所有可能的IP地址
        const possibleIPs = NetworkUtils.getAllPossibleIPs();
        const connectionPromises = [];

        for (const ip of possibleIPs) {
            // 尝试连接到每个可能的端口
            const networkConfig = envConfig.getNetworkConfig();
            const { start, end } = networkConfig.portRange;
            
            for (let port = start; port <= end; port++) {
                // 跳过自己的端口
                if (ip === this.host && port === this.port) continue;
                
                connectionPromises.push(
                    this.connectToPeer(`ws://${ip}:${port}`)
                        .catch(() => {}) // 忽略连接失败
                );
            }
        }

        // 使用 Promise.allSettled 来并行处理所有连接尝试
        const results = await Promise.allSettled(connectionPromises);
        const successfulConnections = results.filter(r => r.status === 'fulfilled').length;
        
        this.logger.info(`Network discovery completed. Found ${successfulConnections} peers`);
    }

    async connectToPeer(address) {
        return new Promise((resolve, reject) => {
            // 跳过自己的地址
            if (address === `ws://${this.host}:${this.port}`) {
                resolve();
                return;
            }

            const ws = new WebSocket(address);
            
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error('Connection timeout'));
            }, 1000);

            ws.on('open', () => {
                clearTimeout(timeout);
                this.logger.info(`Successfully connected to peer at ${address}`);
                this.node.peers.add(ws);
                this.node.knownPeers.add(address);
                
                this.node.messageHandler.sendMessage(ws, {
                    type: MESSAGE_TYPES.HANDSHAKE,
                    data: { 
                        address: `ws://${this.host}:${this.port}`
                    }
                });
                
                resolve(ws);
            });

            ws.on('error', () => {
                clearTimeout(timeout);
                reject(new Error('Connection failed'));
            });
        });
    }

    waitForReady() {
        return new Promise((resolve) => {
            if (this.server.readyState === this.server.OPEN) {
                resolve();
                return;
            }
            this.server.once('listening', () => resolve());
        });
    }
}

export default P2PServer; 