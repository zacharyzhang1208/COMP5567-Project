import { WebSocketServer } from 'ws';
import Chain from './core/blockchain/Chain.js';
import MessageHandler from './network/MessageHandler.js';
import { UserRegistrationTransaction, CourseCreationTransaction } from './core/blockchain/Transactions.js';
import CryptoUtil from './utils/crypto.js';
import { envConfig } from '../config/env.config.js';
import PortUtils from './utils/port.js';

class TeacherNode {
    constructor() {
        this.chain = new Chain();
        this.messageHandler = new MessageHandler(this);
        this.peers = new Set();
        this.status = 'created';
    }

    async initialize() {
        try {
            this.status = 'initializing';
            
            const networkConfig = envConfig.getNetworkConfig();
            const { start, end } = networkConfig.portRange;
            
            this.port = await PortUtils.findAvailablePort(start, end);
            console.log(`[Node] Found available port: ${this.port}`);

            this.setupP2PServer();
            console.log(`[Node] P2P server started on port ${this.port}`);

            await this.waitForServerReady();
            console.log('[Node] Server is ready');

            this.status = 'initialized';
            return true;
        } catch (error) {
            this.status = 'error';
            console.error('[Node] Initialization failed:', error.message);
            return false;
        }
    }

    waitForServerReady() {
        return new Promise((resolve) => {
            if (this.server.readyState === this.server.OPEN) {
                resolve();
                return;
            }
            this.server.once('listening', () => resolve());
        });
    }

    setupP2PServer() {
        const server = new WebSocketServer({ port: this.port });
        this.server = server;
        
        server.on('connection', socket => {
            console.log('[P2P] New peer connected');
            this.peers.add(socket);
            socket.on('message', message => {
                this.messageHandler.handleMessage(JSON.parse(message), socket);
            });
            socket.on('close', () => {
                this.peers.delete(socket);
                console.log('[P2P] Peer disconnected');
            });
            socket.on('error', error => {
                console.error('[P2P] WebSocket error:', error);
            });
        });
    }

    broadcastMessage(message) {
        this.peers.forEach(peer => {
            peer.send(JSON.stringify(message));
        });
    }

    async start() {
        if (this.status !== 'initialized') {
            throw new Error('Node must be initialized before starting');
        }

        try {
            this.status = 'starting';
            
            const { publicKey, privateKey } = CryptoUtil.generateKeyPair('root', 'password');
            
            const userRegTx = new UserRegistrationTransaction({
                userId: 'root',
                userType: 'TEACHER',
                publicKey: publicKey
            });
            
            const signature = CryptoUtil.sign(userRegTx.hash, privateKey);
            userRegTx.signature = signature;
            const isValid = CryptoUtil.verify(userRegTx.hash, signature, publicKey);

            await this.messageHandler.handleNewTransaction(userRegTx);
            
            if (!this.chain.isValidChain()) {
                throw new Error('Blockchain validation failed');
            }

            this.status = 'running';
            console.log('[Node] Node is running');
        } catch (error) {
            this.status = 'error';
            throw error;
        }
    }

    static async startNode() {
        try {
            console.log('[Node] Starting new node...');
            const node = new TeacherNode();
            
            // 初始化节点
            if (!await node.initialize()) {
                throw new Error('Node initialization failed');
            }
            
            // 启动节点
            await node.start();
            console.log('[Node] Node started successfully');
            
            return node;
        } catch (error) {
            console.error('[Node] Failed to start node:', error.message);
            throw error;
        }
    }

}

// 启动节点
TeacherNode.startNode().catch(error => {
    console.error('Failed to start node:', error);
    // 给一个非零的退出码表示错误
    process.exit(1);
});

export default TeacherNode;

