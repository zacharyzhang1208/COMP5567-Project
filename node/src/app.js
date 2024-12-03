import express from 'express';
import { WebSocketServer } from 'ws';
import { ethers } from 'ethers';

class TeacherNode {
    constructor(config = {}) {
        this.port = config.port || 3000;
        this.p2pPort = config.p2pPort || 6001;
        this.peers = new Set();
        this.app = express();
        this.setupExpress();
    }

    setupExpress() {
        // 基本的健康检查接口
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                nodeId: this.nodeId,
                peers: Array.from(this.peers).length,
                timestamp: new Date().toISOString()
            });
        });
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
        // 启动 HTTP 服务器
        this.app.listen(this.port, () => {
            console.log(`Teacher Node HTTP server is running on port ${this.port}`);
        });

        // 启动 P2P 服务器
        this.setupP2PServer();
    }
}

// 创建并启动节点
const node = new TeacherNode({
    port: process.env.PORT || 3000,
    p2pPort: process.env.P2P_PORT || 6001
});

node.start();

export default TeacherNode;
