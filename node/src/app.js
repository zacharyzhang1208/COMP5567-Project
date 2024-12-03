import { WebSocket, WebSocketServer } from 'ws';
import { envConfig } from '../config/env.config.js';

class TeacherNode {
    constructor(config = {}) {
        this.p2pPort = config.p2pPort || 6001;
        this.peers = new Set();
    }

    setupP2PServer() {
        this.p2pServer = new WebSocketServer({ port: this.p2pPort });
        
        this.p2pServer.on('connection', (ws, req) => {
            console.log('New peer connected');
            this.initConnection(ws);
        });

        console.log(`P2P Server is running on port ${this.p2pPort}`);
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
    connectToPeer(peerAddress) {
        const ws = new WebSocket(`ws://${peerAddress}`);
        
        ws.on('open', () => {
            console.log(`Connected to peer: ${peerAddress}`);
            this.initConnection(ws);
        });

        ws.on('error', (error) => {
            console.error(`Failed to connect to peer ${peerAddress}:`, error.message);
        });
    }
}

const _p2pPort = envConfig.get('P2P_PORT')
// 创建并启动节点
const node = new TeacherNode({
    p2pPort: _p2pPort || 6001
});

node.start();

// 如果是 6002 端口，则连接到 6001
if (node.p2pPort === '6002' || node.p2pPort === 6002) {
    setTimeout(() => {
        console.log('Attempting to connect to node on port 6001...');
        node.connectToPeer('localhost:6001');
    }, 1000);  // 延迟1秒连接，确保两个服务都启动
}

export default TeacherNode;
