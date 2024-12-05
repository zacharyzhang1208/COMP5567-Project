import { WebSocketServer, WebSocket } from 'ws';
import { MESSAGE_TYPES } from './message.handler.js';
import PortUtils from '../utils/port.js';
import { envConfig } from '../../config/env.config.js';

class P2PServer {
    constructor(node) {
        this.node = node;
        this.port = null;
    }

    async initialize() {
        // 获取可用端口
        console.log('[P2P] Initializing P2P server...');
        const networkConfig = envConfig.getNetworkConfig();
        const { start, end } = networkConfig.portRange;
        
        this.port = await PortUtils.findAvailablePort(start, end);
        this.node.port = this.port;

        // 启动服务器
        await this.start();
        console.log(`[Node] P2P server started on port ${this.port}`);
        console.log('[Node] Server is ready');

        // 等待一段时间确保服务器完全就绪
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 连接到网络
        await this.connectToNetwork();
        console.log('[Node] Network discovery completed');
    }

    async start() {
        const server = new WebSocketServer({ port: this.port });
        this.server = server;
        
        server.on('connection', socket => {
            console.log('[P2P] New peer connected');
            this.node.peers.add(socket);
            socket.on('message', message => {
                this.node.messageHandler.handleMessage(JSON.parse(message), socket);
            });
            socket.on('close', () => {
                this.node.peers.delete(socket);
                console.log('[P2P] Peer disconnected');
            });
            socket.on('error', error => {
                console.error('[P2P] WebSocket error:', error);
            });
        });

        await this.waitForReady();
    }

    async connectToNetwork() {
        const networkConfig = envConfig.getNetworkConfig();
        const { start, end } = networkConfig.portRange;
        
        console.log(`[P2P] Scanning for peers in port range ${start}-${end}`);
        const connectionPromises = [];
        for (let p = start; p <= end; p++) {
            if (p === this.port) continue;
            connectionPromises.push(this.connectToPeer(`ws://localhost:${p}`));
        }

        await Promise.all(connectionPromises);
        console.log('[P2P] Network scan completed');
    }

    async connectToPeer(address) {
        return new Promise((resolve) => {
            if (address === `ws://localhost:${this.node.port}`) {
                resolve();
                return;
            }
            
            try {
                if(envConfig.isDebugMode()) {
                    console.log(`[P2P] Attempting to connect to peer at ${address}`);
                }   
                const ws = new WebSocket(address);
                
                const timeout = setTimeout(() => {
                    ws.close();
                    console.log(`[P2P] Connection timeout for ${address}`);
                    resolve();
                }, 1000);

                ws.on('open', () => {
                    clearTimeout(timeout);
                    console.log(`[P2P] Successfully connected to peer at ${address}`);
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
                    console.log(`[P2P] Failed to connect to peer at ${address}`);
                    resolve();
                });

                ws.on('close', () => {
                    clearTimeout(timeout);
                    this.node.peers.delete(ws);
                    resolve();
                });
            } catch (err) {
                console.error(`[P2P] Error connecting to peer at ${address}:`, err.message);
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