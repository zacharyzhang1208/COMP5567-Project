import express from 'express';
import cors from 'cors';
import { UserRegistrationTransaction, CourseEnrollmentTransaction, SubmitAttendanceTransaction } from '../core/blockchain/transaction.js';
import CryptoUtil from '../utils/crypto.js';
import Logger from '../utils/logger.js';
import axios from 'axios';

class HttpServer {
    constructor(node) {
        this.node = node;
        this.app = express();
        this.port = null;
        this.logger = new Logger('HTTP');
        this.teacherMappings = new Map(); // 存储老师ID与IP地址和端口号的映射
        this.mappingTimers = new Map(); // 存储映射关系的定时器
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

        // 获取老师节点映射关系
        this.app.get('/teacher/map/:userId', (req, res) => {
            try {
                const { userId } = req.params;
                this.logger.info(`Received request for mapping of teacher ID: ${userId}`);

                const mapping = this.teacherMappings.get(userId);
                if (!mapping) {
                    this.logger.warn(`No mapping found for teacher ID: ${userId}`);
                    return res.status(404).json({ error: 'Mapping not found' });
                }

                res.json({ success: true, mapping });
            } catch (error) {
                this.logger.error('Failed to retrieve mapping:', error);
                res.status(400).json({ error: error.message });
            }
        });

        // 学生交易请求接口
        this.app.post('/student/transaction', async (req, res) => {
            try {
                const { type, ...transactionData } = req.body;
                this.logger.info(`Received transaction request of type: ${type}`);

                // 将type附加到transactionData中
                transactionData.type = type;

                let transaction;
                switch (type) {
                    case 'USER_REGISTRATION':
                        transaction = new UserRegistrationTransaction(transactionData);
                        break;
                    case 'COURSE_ENROLLMENT':
                        transaction = new CourseEnrollmentTransaction(transactionData);
                        break;
                    case 'SUBMIT_ATTENDANCE':
                        transaction = new SubmitAttendanceTransaction(transactionData);
                        break;
                    default:
                        throw new Error('Unknown transaction type');
                }

                // 广播交易到所有教师节点
                this.node.messageHandler.broadcastTransaction(transaction);

                this.logger.info(`Transaction of type ${type} created and broadcasted successfully`);
                res.json({ success: true, transactionHash: transaction.hash });
            } catch (error) {
                this.logger.error('Failed to process student transaction request:', error);
                res.status(400).json({ error: error.message });
            }
        });

        // 老师节点心跳接口
        this.app.post('/teacher/heartbeat', (req, res) => {
            try {
                const { userId, host, port } = req.body;
                this.logger.info(`Received heartbeat from teacher ID: ${userId}`);

                // 更新或创建映射关系
                this.teacherMappings.set(userId, { host, port });

                // 清除旧的定时器
                if (this.mappingTimers.has(userId)) {
                    clearTimeout(this.mappingTimers.get(userId));
                }

                // 设置新的定时器，1分钟后删除映射关系
                const timer = setTimeout(() => {
                    this.teacherMappings.delete(userId);
                    this.mappingTimers.delete(userId);
                    this.logger.info(`Mapping for teacher ID: ${userId} has been removed due to timeout`);
                }, 60 * 1000); // 1分钟

                // 存储新的定时器
                this.mappingTimers.set(userId, timer);

                res.json({ success: true, message: 'Heartbeat received and mapping updated' });
            } catch (error) {
                this.logger.error('Failed to process heartbeat:', error);
                res.status(400).json({ error: error.message });
            }
        });
    }

    async start() {
        // HTTP 8080
        this.port = 8080;
        
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                this.logger.info(`Server started on port ${this.port}`);
                resolve();
            });
        });
    }
}

export default HttpServer; 