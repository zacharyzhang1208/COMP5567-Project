// 区块链类

import { Level } from 'level';
import path from 'path';
import fs from 'fs';
import Block from './block.js';
import { MESSAGE_TYPES } from '../../network/message.handler.js';
import { UserRegistrationTransaction } from './transaction.js';
import CryptoUtil from '../../utils/crypto.js';

class Chain {
    // 生成固定的管理员密钥对
    static ADMIN_KEYS = CryptoUtil.generateKeyPair('admin', 'admin_secret');

    // 定义管理员信息
    static ADMIN_INFO = {
        id: 'admin',
        publicKey: Chain.ADMIN_KEYS.publicKey,
        privateKey: Chain.ADMIN_KEYS.privateKey,  // 在实际部署时应该安全存储
        role: 'ADMIN'
    };

    // 定义统一的创世区块
    static GENESIS_BLOCK = (() => {
        // 创建管理员注册交易
        const adminRegTx = new UserRegistrationTransaction({
            userId: Chain.ADMIN_INFO.id,
            userType: Chain.ADMIN_INFO.role,
            publicKey: Chain.ADMIN_INFO.publicKey,
            timestamp: 1701676800000,  // 2023-12-04 12:00:00 UTC
            signature: ''
        });

        // 创建创世区块
        const block = new Block({
            timestamp: 1701676800000,  // 2023-12-04 12:00:00 UTC
            transactions: [adminRegTx],  // 包含管理员注册交易
            previousHash: '0',
            validatorId: 'genesis',
            validatorPubKey: '',
            signature: ''
        });

        // 计算区块哈希
        block.hash = block.calculateHash();
        return block;
    })();

    constructor(node) {
        this.node = node;
        this.chainData = [];
        this.pendingTransactions = new Map();
    }

    async initialize() {
        const nodeDataDir = path.join(process.cwd(), '.data', `node-${this.node.port}`);
        
        if (!fs.existsSync(nodeDataDir)) {
            fs.mkdirSync(nodeDataDir, { recursive: true });
        }

        const dbPath = path.join(nodeDataDir, 'chain.data');
        this.db = new Level(dbPath);
        console.log(this.db);
        await this.loadChain();
        await this.synchronizeChain();
        console.log("chain initialized");
        console.log(this.chainData.length);
    }

    async synchronizeChain() {
        console.log("peers.size",this.node.peers.size);
        if (this.node.peers.size > 0) {
            console.log('[Chain] Starting chain synchronization');
            const randomPeer = Array.from(this.node.peers)[0];
            this.node.messageHandler.sendMessage(randomPeer, {
                type: MESSAGE_TYPES.REQUEST_CHAIN
            });
        }
    }

    async saveChain() {
        try {
            // 保存区块链数据
            await this.db.put('chain', JSON.stringify(this.chainData.map(block => block.toJSON())));
            // 保存待处理交易
            await this.db.put('pending', JSON.stringify(Array.from(this.pendingTransactions.values())));
        } catch (error) {
            console.error('Error saving chain:', error);
        }
    }

    async loadChain() {
        try {
            console.log("loading chain");
            const chainData = await this.db.get('chain');
            const parsedChainData = JSON.parse(chainData);
            
            // 验证第一个区块是否是正确的创世区块
            if (parsedChainData[0].hash !== Chain.GENESIS_BLOCK.hash) {
                throw new Error('Invalid genesis block');
            }
            
            this.chainData = parsedChainData.map(data => new Block(data));
            
            const pendingData = await this.db.get('pending');
            const parsedPendingData = JSON.parse(pendingData);
            parsedPendingData.forEach(tx => {
                this.pendingTransactions.set(tx.hash, tx);
            });
        } catch (error) {
            if (error.code === 'LEVEL_NOT_FOUND') {
                console.log("[Chain] No existing chain found, starting with genesis block");
                this.chainData = [Chain.GENESIS_BLOCK];
                await this.saveChain();
            } else if (error.message === 'Invalid genesis block') {
                console.error('[Chain] Invalid genesis block detected');
                throw error;
            } else {
                console.error('Error loading chain:', error);
                throw error;
            }
        }
    }

    /**
     * 获取最新的区块
     */
    getLatestBlock() {
        return this.chainData[this.chainData.length - 1];
    }

    /**
     * 添加新的交易到待处理池
     * @param {Transaction} transaction 
     * @returns {string} 交易哈希
     */
    addTransaction(transaction) {
        if (!transaction.isValid()) {
            throw new Error('Invalid transaction');
        }
        this.pendingTransactions.set(transaction.hash, transaction);
        return transaction.hash;
    }

    /**
     * 创建新区块
     * @param {string} validatorId 验证者地址
     * @param {string} validatorPubKey 验证者公钥
     * @param {string} signature 验证者签名
     */
    createBlock(validatorId, validatorPubKey, signature) {
        const now = Date.now();

        const transactions = Array.from(this.pendingTransactions.values());
        const previousBlock = this.getLatestBlock();

        const newBlock = new Block({
            timestamp: now,
            transactions,
            previousHash: previousBlock.hash,
            validatorId,
            validatorPubKey,
            signature
        });

        if (this.isValidBlock(newBlock, previousBlock)) {
            this.chainData.push(newBlock);
            this.pendingTransactions.clear();
            this.saveChain();
            return newBlock;
        }

        throw new Error('Invalid block');
    }

    /**
     * 验证区块的有效性
     * @param {Block} block 要验证的区块
     * @param {Block} previousBlock 前一个区块
     */
    isValidBlock(block, previousBlock) {
        if (!block.isValid()) {
            console.log("block is not valid");
            return false;
        }

        if (block.previousHash !== previousBlock.hash) {
            console.log("previous hash is not equal");
            return false;
        }

        if (block.timestamp <= previousBlock.timestamp) {
            console.log("timestamp is not valid");
            return false;
        }

        return true;
    }

    /**
     * 验证整个链的有效性
     */
    isValidChain() {
        for (let i = 1; i < this.chainData.length; i++) {
            const currentBlock = this.chainData[i];
            const previousBlock = this.chainData[i - 1];

            if (!this.isValidBlock(currentBlock, previousBlock)) {
                return false;
            }
        }
        return true;
    }

    /**
     * 替换链（在收到更长的有效链时）
     * @param {Object} chainData 包含 chain 和 pendingTransactions
     */
    replaceChain(chainData) {
        const { chain: newChain, pendingTransactions } = chainData;

        // 将 JSON 数据转换为 Block 对象
        const newBlockChain = newChain.map(blockData => new Block(blockData));

        // 新链必须更长
        if (newBlockChain.length < this.chainData.length) {
            throw new Error('New chain must be longer');
        }
        // 验证新链       
        else{
            console.log("validating new chain");
            for (let i = 1; i < newBlockChain.length; i++) {
                const block = newBlockChain[i];
                const previousBlock = newBlockChain[i - 1];
                if (!this.isValidBlock(block, previousBlock)) {
                    throw new Error('Invalid chain');
                }
            }
        }

        // 替换链
        this.chainData = newBlockChain;
        
        // 更新待处理交易池
        //this.pendingTransactions.clear();
        pendingTransactions.forEach(tx => {
            this.pendingTransactions.set(tx.hash, tx);
        });

        // 清理交易池中已经包含在新链中的交易
        this.cleanTransactionPool(newBlockChain);
        this.saveChain();
    }

    /**
     * 清理交易池
     * @param {Array<Block>} chain 
     */
    cleanTransactionPool(chain) {
        const processedTransactions = new Set();
        
        // 收集所有链中的交易
        chain.forEach(block => {
            block.transactions.forEach(tx => {
                processedTransactions.add(tx.hash);
            });
        });

        // 从待处理池中移除已处理的交易
        for (const [hash] of this.pendingTransactions) {
            if (processedTransactions.has(hash)) {
                this.pendingTransactions.delete(hash);
            }
        }
    }

    /**
     * 获取链的JSON表示
     */
    toJSON() {
        return {
            chain: this.chainData.map(block => block.toJSON()),
            pendingTransactions: Array.from(this.pendingTransactions.values()).map(tx => tx.toJSON())
        };
    }

    /**
     * 获取待处理的交易列表
     * @returns {Array} 待处理的交易数组
     */
    getPendingTransactions() {
        return Array.from(this.pendingTransactions.values());
    }
}

export default Chain; 