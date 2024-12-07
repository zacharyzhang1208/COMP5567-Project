import Chain from '../blockchain/chain.js';
import MessageHandler from '../../network/message.handler.js';
import P2PServer from '../../network/p2p.server.js';
import HttpServer from '../../http/http.server.js';
import { EventEmitter } from 'events';

class BaseNode extends EventEmitter {
    constructor() {
        super();
        this.messageHandler = new MessageHandler(this);
        this.peers = new Set();
        this.knownPeers = new Set();
        this.port = null;
        this.status = 'created';
        this.p2pServer = new P2PServer(this);
        this.chain = new Chain(this);
        this.httpServer = new HttpServer(this);
    }

    async initialize() {
        try {
            this.status = 'initializing';
            
            await this.p2pServer.initialize();
            await this.chain.initialize();
            await this.httpServer.initialize();
            
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
            await this.onStart();
            this.status = 'running';
            console.log('[Node] Node is running');
        } catch (error) {
            this.status = 'error';
            throw error;
        }
    }

    // 子类需要实现的方法
    async onStart() {
        throw new Error('onStart method must be implemented by child class');
    }
}

export default BaseNode; 