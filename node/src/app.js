import { WebSocket, WebSocketServer } from 'ws';
import { envConfig } from '../config/env.config.js';

class TeacherNode {
    constructor(config = {}) {
        const networkConfig = envConfig.getNetworkConfig();
        this.p2pPort = config.p2pPort || networkConfig.port;
        this.p2pHost = config.p2pHost || networkConfig.host;
        this.peers = new Set();
    }

    setupP2PServer() {
        this.p2pServer = new WebSocketServer({ 
            port: this.p2pPort,
            host: this.p2pHost  // 指定监听的网络接口
        });
        
        this.p2pServer.on('connection', (ws, req) => {
            const clientAddress = req.socket.remoteAddress;
            console.log(`New peer connected from ${clientAddress}`);
            this.initConnection(ws);
        });

        console.log(`P2P Server is running on ${this.p2pHost}:${this.p2pPort}`);
    }

    initConnection(ws) {
        this.peers.add(ws);
        console.log('Connected peers:', this.peers.size);

        ws.on('close', () => {
            this.peers.delete(ws);
            console.log('Peer disconnected. Connected peers:', this.peers.size);
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.peers.delete(ws);
        });

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleMessage(message, ws);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });
    }

    handleMessage(message, ws) {
        console.log('Received message:', message.type);
        // 后续添加消息处理逻辑
    }

    start() {
        // 只启动 P2P 服务器
        this.setupP2PServer();
    }

    // 添加连接到其他节点的方法
    connectToPeer(peerHost, peerPort) {
        const ws = new WebSocket(`ws://${peerHost}:${peerPort}`);
        
        ws.on('open', () => {
            console.log(`Connected to peer: ${peerHost}:${peerPort}`);
            this.initConnection(ws);
        });

        ws.on('error', (error) => {
            console.error(`Failed to connect to peer ${peerHost}:${peerPort}:`, error.message);
        });
    }
}

// 创建并启动节点
const node = new TeacherNode({
    p2pPort: envConfig.get('P2P_PORT'),
    p2pHost: envConfig.get('P2P_HOST')
});

node.start();

node.connectToPeer('172.20.10.7', '6002');

export default TeacherNode;
