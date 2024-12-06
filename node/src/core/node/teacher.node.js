import BaseNode from './base.node.js';
import CryptoUtil from '../../utils/crypto.js';
import { UserRegistrationTransaction } from '../blockchain/transaction.js';
import Block from '../blockchain/block.js';
import CLI from '../../utils/cli.js';
import PortUtils from '../../utils/port.js';

class TeacherNode extends BaseNode {
    constructor() {
        super();
        this.isLoggedIn = false;
        this.currentUser = null;
        
        console.log('[Node] Setting up signal handlers...');

        process.on('SIGINT', async () => {
            console.log('\n[Node] Received SIGINT signal');
            await this.shutdown();
            process.exit(0);
        });

        process.on('exit', (code) => {
            console.log(`\n[Node] Process exit with code: ${code}`);
        });
    }

    async shutdown() {
        try {
            console.log('\n[Node] Starting shutdown process...');
            
            // 检查 chain 和 db 是否已初始化
            if (this.chain) {
                try {
                    if (this.chain.db) {
                        await this.chain.saveChain();
                        await this.chain.db.close();
                        console.log('[Node] Database closed');
                    } else {
                        console.log('[Node] No database connection to close');
                    }
                } catch (error) {
                    console.error('[Node] Error during chain cleanup:', error);
                }
            }
            
            // 检查网络连接是否已初始化
            if (this.peers) {
                try {
                    this.peers.forEach(peer => peer.close());
                    console.log('[Node] Peer connections closed');
                } catch (error) {
                    console.error('[Node] Error closing peer connections:', error);
                }
            }

            if (this.p2pServer && this.p2pServer.server) {
                try {
                    this.p2pServer.server.close();
                    console.log('[Node] P2P server closed');
                } catch (error) {
                    console.error('[Node] Error closing P2P server:', error);
                }
            }

            console.log('[Node] Shutdown completed');
        } catch (error) {
            console.error('[Node] Error during shutdown:', error);
        }
    }

    async login() {
        console.log('\n=== Teacher Node Login ===');
        const username = await CLI.prompt('Username: ');
        const password = await CLI.prompt('Password: ');

        const { publicKey, privateKey } = CryptoUtil.generateKeyPair(username, password);
        // 目前直接登录成功
        this.isLoggedIn = true;
        this.currentUser = {
            privateKey,
            publicKey,
            username,
            role: 'TEACHER'
        };
        
        console.log(`\nWelcome, ${username}!`);
        return true;
    }

    async onStart() {
        // 教师节点特有的启动逻辑
        
        
        const userRegTx = new UserRegistrationTransaction({
            userId: 'root',
            userType: 'TEACHER',
            publicKey: this.currentUser.publicKey
        });
        
        const signature = CryptoUtil.sign(userRegTx.hash, this.currentUser.privateKey);
        userRegTx.signature = signature;
        const isValid = CryptoUtil.verify(userRegTx.hash, signature, this.currentUser.publicKey);

        this.chain.addTransaction(userRegTx);
        await this.messageHandler.broadcastTransaction(userRegTx);
        await this.chain.saveChain();
        
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