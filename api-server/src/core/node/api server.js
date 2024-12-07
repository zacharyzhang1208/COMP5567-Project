import BaseNode from './base.node.js';
import CryptoUtil from '../../utils/crypto.js';
import { UserRegistrationTransaction } from '../blockchain/transaction.js';
import Block from '../blockchain/block.js';
import CLI from '../../utils/cli.js';
import axios from 'axios';

class ApiServer extends BaseNode {
    constructor(id, ipAddress, port) {
        super();
        this.id = id;
        this.ipAddress = ipAddress;
        this.port = port;
        this.isLoggedIn = true;
        this.currentUser = null;

        process.on('SIGINT', async () => {
            console.log('\n[Node] Received SIGINT signal');
            process.exit(0);
        });

        process.on('exit', (code) => {
            console.log(`\n[Node] Process exit with code: ${code}`);
        });
    }

    // async login() {
    //     console.log('\n=== Node Login ===');
    //     const username = await CLI.prompt('Username: ');
    //     const password = await CLI.prompt('Password: ');

    //     // 1. 生成密钥对
    //     const { publicKey, privateKey } = CryptoUtil.generateKeyPair(username, password);
        
    //     // 2. 生成加密后的私钥哈希
    //     const encryptedPrivateKey = CryptoUtil.encrypt(privateKey, password);
    //     const encryptedPrivateKeyHash = CryptoUtil.hash(encryptedPrivateKey);

    //     // 3. 在区块链中查找用户注册交易
    //     const userRegTx = UserRegistrationTransaction.findByUsername(this.chain, username);
    //     if (!userRegTx) {
    //         console.log('\n[Node] User not found');
    //         return false;
    //     }

    //     // 4. 验证哈希值
    //     if (userRegTx.encryptedPrivateKeyHash !== encryptedPrivateKeyHash) {
    //         console.log('\n[Node] Invalid credentials');
    //         return false;
    //     }

    //     // 5. 登录成功，保存用户信息
    //     this.isLoggedIn = true;
    //     this.currentUser = {
    //         privateKey,                    // 原始私钥（用于签名）
    //         publicKey,                     // 公钥
    //         username,                      // 用户名
    //         password,                      // 密码（用于加密/解密）
    //         encryptedPrivateKey,          // 加密后的私钥
    //         encryptedPrivateKeyHash,      // 加密后私钥的哈希值
    //         role: userRegTx.userType      // 从链上获取用户角色
    //     };
        
    //     console.log(`\nWelcome, ${username}!`);
    //     return true;
    // }

    async onStart() {
        // console.log('currentUser.privateKey', this.currentUser.privateKey);
        
        // 使用用户密码加密私钥并计算哈希
        // const encryptedPrivateKeyHash = CryptoUtil.hash(
        //     CryptoUtil.encrypt(this.currentUser.privateKey, this.currentUser.password)
        // );
        
        // const userRegTx = new UserRegistrationTransaction({
        //     userId: 'test_001',
        //     userType: 'TEACHER',
        //     publicKey: this.currentUser.publicKey,
        //     encryptedPrivateKeyHash: encryptedPrivateKeyHash,  // 添加加密后的私钥哈希
        //     timestamp: Date.now()
        // });
        
        // const signature = CryptoUtil.sign(userRegTx.hash, this.currentUser.privateKey);
        // userRegTx.signature = signature;

        // this.chain.addTransaction(userRegTx);
        // await this.messageHandler.broadcastTransaction(userRegTx);
        // await this.chain.saveChain();
        
        // if (!this.chain.isValidChain()) {
        //     throw new Error('Blockchain validation failed');
        // }
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

    // async sendMappingRequest(apiServerUrl) {
    //     try {
    //         const requestData = {
    //             teacherId: this.id,
    //             ipAddress: this.ipAddress,
    //             port: this.port
    //         };

    //         const response = await axios.post(`${apiServerUrl}/teacher/map`, requestData);
    //         console.log('Mapping request response:', response.data);
    //     } catch (error) {
    //         console.error('Failed to send mapping request:', error);
    //     }
    // }

    // async sendUnmappingRequest(apiServerUrl) {
    //     try {
    //         const requestData = {
    //             teacherId: this.id
    //         };

    //         const response = await axios.post(`${apiServerUrl}/teacher/unmap`, requestData);
    //         console.log('Unmapping request response:', response.data);
    //     } catch (error) {
    //         console.error('Failed to send unmapping request:', error);
    //     }
    // }

    // async sendHeartbeat(apiServerUrl) {
    //     try {
    //         const requestData = {
    //             userId: this.id,
    //             ipAddress: this.ipAddress,
    //             port: this.port
    //         };

    //         const response = await axios.post(`${apiServerUrl}/teacher/heartbeat`, requestData);
    //         console.log('Heartbeat response:', response.data);
    //     } catch (error) {
    //         console.error('Failed to send heartbeat:', error);
    //     }
    // }

    static async startNode() {
        try {
            console.log('[Node] Starting new api server...');
            const node = new ApiServer();
            
            if (!await node.initialize()) {
                throw new Error('Node initialization failed');
            }

            // 添加登录步骤
            // if (!await node.login()) {
            //     throw new Error('Login failed');
            // }
            
            await node.start();
            console.log('[Node] Apiserver started successfully');

            // 定时发送心跳请求
            // setInterval(() => {
            //     node.sendHeartbeat('http://api-server-url:port');
            // }, 60 * 1000); // 每分钟发送一次

            return node;
        } catch (error) {
            console.error('[Node] Failed to start node:', error.message);
            throw error;
        }
    }
}

export default ApiServer;
