import express from 'express';
import cors from 'cors';
import { UserRegistrationTransaction } from '../core/blockchain/transaction.js';
import CryptoUtil from '../utils/crypto.js';

class HttpServer {
    constructor(node) {
        this.node = node;
        this.app = express();
        this.port = null;
    }

    async initialize() {
        console.log('[HTTP] Initializing HTTP server');
        // 设置中间件
        this.setupMiddleware();
        // 设置路由
        this.setupRoutes();
        // 启动服务器
        
        await this.start();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
    }

    setupRoutes() {
        // 健康检查
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });

        // 获取区块链数据
        this.app.get('/chain', (req, res) => {
            res.json(this.node.chain.chainData);
        });

        // 获取待处理交易
        this.app.get('/pending', (req, res) => {
            const transactions = Array.from(this.node.chain.pendingTransactions.values());
            res.json(transactions);
        });

        // 提交新交易
        this.app.post('/transaction', async (req, res) => {
            try {
                const { type, ...transactionData } = req.body;
                let transaction;

                switch (type) {
                    case 'USER_REGISTRATION':
                        transaction = new UserRegistrationTransaction(transactionData);
                        break;
                    // ... 其他交易类型
                    default:
                        throw new Error('Unknown transaction type');
                }

                await this.node.chain.addTransaction(transaction);
                await this.node.messageHandler.broadcastTransaction(transaction);
                
                res.json({ success: true, hash: transaction.hash });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        // 获取节点信息
        this.app.get('/info', (req, res) => {
            res.json({
                p2pPort: this.node.port,
                httpPort: this.port,
                peers: Array.from(this.node.peers).length,
                chainLength: this.node.chain.chainData.length,
                pendingTransactions: this.node.chain.pendingTransactions.size
            });
        });
    }

    async start() {
        // HTTP 端口为 P2P 端口 + 1000
        this.port = this.node.port + 1000;
        
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                console.log(`[HTTP] Server started on port ${this.port}`);
                resolve();
            });
        });
    }
}

export default HttpServer; 