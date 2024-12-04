import Chain from './blockchain/chain.js';
import MessageHandler from '../network/message.handler.js';
import P2PServer from '../network/p2p.server.js';
import NetworkManager from '../network/network.manager.js';
import { envConfig } from '../../config/env.config.js';
import PortUtils from '../utils/port.js';

class TeacherNode {
    constructor() {
        this.messageHandler = new MessageHandler(this);
        this.peers = new Set();
        this.knownPeers = new Set();
        this.status = 'created';
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

    async start() {
        if (this.status !== 'initialized') {
            throw new Error('Node must be initialized before starting');
        }

        try {
            this.status = 'starting';
            // 这里可以添加其他启动逻辑，比如创建初始用户等
            this.status = 'running';
            console.log('[Node] Node is running');
        } catch (error) {
            this.status = 'error';
            throw error;
        }
    }

    async initialize() {
        try {
            this.status = 'initializing';
            await this.setupNode();
            await this.startServices();
            this.status = 'initialized';
            return true;
        } catch (error) {
            this.status = 'error';
            console.error('[Node] Initialization failed:', error.message);
            return false;
        }
    }

    async setupNode() {
        // 获取可用端口
        const networkConfig = envConfig.getNetworkConfig();
        const { start, end } = networkConfig.portRange;
        this.port = await PortUtils.findAvailablePort(start, end);
        console.log(`[Node] Found available port: ${this.port}`);

        // 初始化区块链
        this.chain = new Chain(this);
    }

    async startServices() {
        // 启动 P2P 服务器
        this.p2pServer = new P2PServer(this);
        await this.p2pServer.start();

        // 启动网络管理器
        this.networkManager = new NetworkManager(this);
        await this.networkManager.connectToNetwork();
    }

    // ... 其他方法
}

export default TeacherNode; 