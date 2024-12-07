import express from 'express';
import cors from 'cors';
import { UserRegistrationTransaction } from '../core/blockchain/transaction.js';
import Logger from '../utils/logger.js';

class HttpServer {
    constructor(node) {
        this.node = node;
        this.app = express();
        this.port = null;
        this.logger = new Logger('HTTP');
    }

    async initialize() {
        this.logger.info('Initializing HTTP server');
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
            this.logger.debug('Received request for chain data');
            res.json(this.node.chain.chainData);
        });

        // 获取待处理交易
        this.app.get('/pending', (req, res) => {
            this.logger.debug('Received request for pending transactions');
            const transactions = Array.from(this.node.chain.pendingTransactions.values());
            res.json(transactions);
        });

        // 提交新交易
        this.app.post('/transaction', async (req, res) => {
            try {
                const { type, ...transactionData } = req.body;
                this.logger.info(`Received new transaction of type: ${type}`);
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
                
                this.logger.info(`Transaction added successfully: ${transaction.hash}`);
                res.json({ success: true, hash: transaction.hash });
            } catch (error) {
                this.logger.error('Failed to process transaction:', error);
                res.status(400).json({ error: error.message });
            }
        });

        // 获取节点信息
        this.app.get('/info', (req, res) => {
            this.logger.debug('Received request for node info');
            res.json({
                p2pPort: this.node.port,
                httpPort: this.port,
                peers: Array.from(this.node.peers).length,
                chainLength: this.node.chain.chainData.length,
                pendingTransactions: this.node.chain.pendingTransactions.size
            });
        });

        // 创建新区块
        this.app.post('/blocks/create', async (req, res) => {
            try {
                this.logger.info('Attempting to create new block');
                const newBlock = await this.node.createNewBlock();
                this.logger.info(`New block created: ${newBlock.hash}`);
                res.json({
                    success: true,
                    block: newBlock
                });
            } catch (error) {
                this.logger.error('Failed to create block:', error);
                res.status(400).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // 登录路由
        this.app.post('/login', async (req, res) => {
            try {
                const { username, publicKey, encryptedPrivateKeyHash } = req.body;
                
                // 在区块链中查找用户注册交易
                const userRegTx = UserRegistrationTransaction.findByUsername(this.node.chain, username);
                if (!userRegTx) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // 验证哈希值
                if (userRegTx.encryptedPrivateKeyHash !== encryptedPrivateKeyHash) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                // 返回用户信息
                res.json({
                    success: true,
                    role: userRegTx.userType
                });
            } catch (error) {
                this.logger.error('Login error:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    }

    async start() {
        // HTTP 端口为 P2P 端口 + 1000
        this.port = this.node.port + 1000;
        
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                this.logger.info(`Server started on port ${this.port}`);
                resolve();
            });
        });
    }
}

export default HttpServer; 