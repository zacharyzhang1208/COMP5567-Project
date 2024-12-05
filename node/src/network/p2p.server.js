import { WebSocketServer, WebSocket } from 'ws';
import { MESSAGE_TYPES } from './message.handler.js';
import PortUtils from '../utils/port.js';
import { envConfig } from '../../config/env.config.js';
import Logger from '../utils/logger.js';

class P2PServer {
    constructor(node) {
        this.node = node;
        this.port = null;
        this.logger = new Logger('P2P');
    }

    async initialize() {
        // 获取可用端口
        this.logger.info('Initializing P2P server...');
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
        const networkConfig = envConfig.getNetworkConfig();
        const { start, end } = networkConfig.portRange;
        
        this.logger.info(`Scanning for peers in port range ${start}-${end}`);
        const connectionPromises = [];
        for (let p = start; p <= end; p++) {
            if (p === this.port) continue;
            connectionPromises.push(this.connectToPeer(`ws://localhost:${p}`));
        }

        await Promise.all(connectionPromises);
        this.logger.info('Network scan completed');
    }

    async connectToPeer(address) {
        return new Promise((resolve) => {
            if (address === `ws://localhost:${this.node.port}`) {
                resolve();
                return;
            }
            
            try {
                if(envConfig.isDebugMode()) {
                    this.logger.debug(`Attempting to connect to peer at ${address}`);
                }   
                const ws = new WebSocket(address);
                
                const timeout = setTimeout(() => {
                    ws.close();
                    this.logger.debug(`Connection timeout for ${address}`);
                    resolve();
                }, 1000);

                ws.on('open', () => {
                    clearTimeout(timeout);
                    this.logger.info(`Successfully connected to peer at ${address}`);
                    this.node.peers.add(ws);
                    this.node.knownPeers.add(address);
                    
                    this.node.messageHandler.sendMessage(ws, {
                        type: MESSAGE_TYPES.HANDSHAKE,
                        data: { port: this.port }
                    });
                    
                    ws.on('message', (message) => {
                        const data = JSON.parse(message);
                        this.node.messageHandler.handleMessage(data, ws);
                        
                        if (data.type === MESSAGE_TYPES.HANDSHAKE_RESPONSE) {
                            resolve();
                        }
                    });
                });

                ws.on('error', () => {
                    clearTimeout(timeout);
                    this.logger.debug(`Failed to connect to peer at ${address}`);
                    resolve();
                });

                ws.on('close', () => {
                    clearTimeout(timeout);
                    this.node.peers.delete(ws);
                    resolve();
                });
            } catch (err) {
                this.logger.error(`Error connecting to peer at ${address}:`, err.message);
                resolve();
            }
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