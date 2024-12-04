import Chain from './core/blockchain/chain.js';
import MessageHandler from './network/message.handler.js';
import P2PServer from './network/p2p.server.js';
import { UserRegistrationTransaction } from './core/blockchain/transaction.js';
import CryptoUtil from './utils/crypto.js';

class TeacherNode {
    constructor() {
        this.messageHandler = new MessageHandler(this);
        this.peers = new Set(); //连接到本节点的节点
        this.knownPeers = new Set(); //已知的节点
        this.status = 'created';
    }

    async initialize() {
        try {
            this.status = 'initializing';
            
            this.chain = new Chain(this);
            
            this.p2pServer = new P2PServer(this);
            await this.p2pServer.initialize();

            this.status = 'initialized';
            return true;
        } catch (error) {
            this.status = 'error';
            console.error('[Node] Initialization failed:', error.message);
            return false;
        }
    }

    async start() {
        if (this.status !== 'initialized') {
            throw new Error('Node must be initialized before starting');
        }

        try {
            this.status = 'starting';
            
            //test code
            const { publicKey, privateKey } = CryptoUtil.generateKeyPair('root', 'password');
            
            const userRegTx = new UserRegistrationTransaction({
                userId: 'root',
                userType: 'TEACHER',
                publicKey: publicKey
            });
            
            const signature = CryptoUtil.sign(userRegTx.hash, privateKey);
            userRegTx.signature = signature;
            const isValid = CryptoUtil.verify(userRegTx.hash, signature, publicKey);

            this.chain.addTransaction(userRegTx);
            await this.messageHandler.broadcastTransaction(userRegTx);
            
            if (!this.chain.isValidChain()) {
                throw new Error('Blockchain validation failed');
            }
            //test code end

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

