import BaseNode from './base.node.js';
import CryptoUtil from '../../utils/crypto.js';
import { UserRegistrationTransaction } from '../blockchain/transaction.js';
import Block from '../blockchain/block.js';

class TeacherNode extends BaseNode {
    async onStart() {
        // 教师节点特有的启动逻辑
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
            
            await node.start();
            console.log('[Node] Teacher node started successfully');
            
            return node;
        } catch (error) {
            console.error('[Node] Failed to start teacher node:', error.message);
            throw error;
        }
    }
}

export default TeacherNode; 