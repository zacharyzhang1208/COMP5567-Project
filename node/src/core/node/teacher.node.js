import BaseNode from './base.node.js';
import CryptoUtil from '../../utils/crypto.js';
import { UserRegistrationTransaction } from '../blockchain/transaction.js';
import Block from '../blockchain/block.js';
import CLI from '../../utils/cli.js';
import fetch from 'node-fetch';
import { envConfig } from '../../../config/env.config.js';
import NetworkUtils from '../../utils/network.js';

class TeacherNode extends BaseNode {
    constructor() {
        super();
        this.isLoggedIn = false;
        this.currentUser = null;
        this.mapInterval = null;  // 添加定时器引用

        process.on('SIGINT', async () => {
            console.log('\n[Node] Received SIGINT signal');
            
            // 清理定时器
            if (this.mapInterval) {
                clearInterval(this.mapInterval);
            }

            // 发送取消映射请求
            if (this.currentUser) {
                await this.sendUnmapRequest();
            }

            process.nextTick(() => process.exit(0));
        });
    }

    async login() {
        console.log('\n=== Node Login ===');
        const userId = await CLI.prompt('UserId: ');
        const password = await CLI.prompt('Password: ');

        // 1. 生成密钥对
        const { publicKey, privateKey } = CryptoUtil.generateKeyPair(userId, password);
        
        // 2. 生成加密后的私钥哈希
        const encryptedPrivateKey = CryptoUtil.encrypt(privateKey, password);
        const encryptedPrivateKeyHash = CryptoUtil.hash(encryptedPrivateKey);

        // 3. 在区块链中查找用户注册交易
        const userRegTx = UserRegistrationTransaction.findByUsername(this.chain, userId);
        if (!userRegTx) {
            console.log('\n[Node] User not found');
            return false;
        }

        // 4. 验证哈希值
        if (userRegTx.encryptedPrivateKeyHash !== encryptedPrivateKeyHash) {
            console.log('\n[Node] Invalid credentials');
            return false;
        }
        // 5. 发送首次心跳请求
        if (!await this.sendMapRequest(userId)) {
            return false;
        }

        // 6. 保存用户信息
        this.isLoggedIn = true;
        this.currentUser = {
            privateKey,
            publicKey,
            userId,
            password,
            encryptedPrivateKey,
            encryptedPrivateKeyHash,
            role: userRegTx.userType  // 从链上获取用户角色
        };

        // 7. 启动定时心跳任务
        this.startMapInterval(userId);
        
        console.log(`\nWelcome, ${userId}!`);
        return true;
    }

    // 发送映射请求
    async sendMapRequest(userId) {
        const { ip, port } = envConfig.getApiServerConfig();
        try {
            const response = await fetch(`http://${ip}:${port}/teacher/heartbeat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    host: NetworkUtils.getLocalIP(),
                    port: this.port+1000,
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.log('\n[Node] Mapping failed:', error.message);
                return false;
            }
            return true;
        } catch (error) {
            console.error('\n[Node] Network error during mapping:', error.message);
            return false;
        }
    }

    // 启动定时映射任务
    startMapInterval(userId) {
        // 存储定时器ID以便清理
        this.mapInterval = setInterval(async () => {
            await this.sendMapRequest(userId);
        }, 30000);  // 每30秒执行一次
    }

    async onStart() {
        console.log('currentUser.privateKey', this.currentUser.privateKey);
        
        // 使用用户密码加密私钥并计算哈希
        const encryptedPrivateKeyHash = CryptoUtil.hash(
            CryptoUtil.encrypt(this.currentUser.privateKey, this.currentUser.password)
        );
        
        const userRegTx = new UserRegistrationTransaction({
            userId: 'test_001',
            userType: 'TEACHER',
            publicKey: this.currentUser.publicKey,
            encryptedPrivateKeyHash: encryptedPrivateKeyHash,  // 添加加密后的私钥哈希
            timestamp: Date.now()
        });
        
        const signature = CryptoUtil.sign(userRegTx.hash, this.currentUser.privateKey);
        userRegTx.signature = signature;

        this.chain.addTransaction(userRegTx);
        await this.messageHandler.broadcastTransaction(userRegTx);
        await this.chain.saveChain();
        console.log('pendingTransactions.size', this.chain.pendingTransactions.size);
        
        if (!this.chain.isValidChain()) {
            throw new Error('Blockchain validation failed');
        }
    }

    // 手动打包新区块
    async createNewBlock() {
        try {
            // 获取待打包的交易
            const transactions = this.chain.getPendingTransactions();
            if (transactions.length === 0) {
                throw new Error('No pending transactions to pack');
            }

            // 获取最新区块
            const previousBlock = this.chain.getLatestBlock();
            
            // 创建新区块
            const newBlock = new Block({
                timestamp: Date.now(),
                transactions: transactions,
                previousHash: previousBlock.hash,
                validatorId: 'root',  // 使用教师节点的ID
                validatorPubKey: CryptoUtil.generateKeyPair('root', 'password').publicKey
            });

            // 教师节点签名区块
            const { privateKey } = CryptoUtil.generateKeyPair('root', 'password');
            const signature = CryptoUtil.sign(newBlock.hash, privateKey);
            newBlock.signature = signature;

            // 添加区块到链上
            this.chain.createBlock(newBlock.validatorId, newBlock.validatorPubKey, newBlock.signature);
            
            // 广播新区块
            await this.messageHandler.broadcastBlock(newBlock);
            
            console.log(`[TeacherNode] New block created: ${newBlock.hash}`);
            return newBlock;
        } catch (error) {
            console.error('[TeacherNode] Failed to create block:', error);
            throw error;
        }
    }

    static async startNode() {
        try {
            console.log('[Node] Starting new teacher node...');
            const node = new TeacherNode();
            
            if (!await node.initialize()) {
                throw new Error('Node initialization failed');
            }

            // 添加登录步骤
            if (!await node.login()) {
                throw new Error('Login failed');
            }
            
            await node.start();
            console.log('[Node] Teacher node started successfully');
            
            return node;
        } catch (error) {
            console.error('[Node] Failed to start node:', error.message);
            throw error;
        }
    }
}

export default TeacherNode; 