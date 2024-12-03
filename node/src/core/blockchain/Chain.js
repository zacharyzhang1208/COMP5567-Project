import Block from './Block.js';
import { createHash } from 'crypto';

class Chain {
    constructor() {
        // 初始化区块链
        this.chain = [this.createGenesisBlock()];
        // 待处理的交易池
        this.pendingTransactions = new Map();
    }

    /**
     * 创建创世区块
     */
    createGenesisBlock() {
        return new Block({
            timestamp: Date.now(),
            transactions: [],
            previousHash: '0',
            validator: 'genesis'
        });
    }

    /**
     * 获取最新的区块
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
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
     * @param {string} validator 验证者地址
     * @param {string} signature 验证者签名
     */
    createBlock(validator, signature) {
        const now = Date.now();

        const transactions = Array.from(this.pendingTransactions.values());
        const previousBlock = this.getLatestBlock();

        const newBlock = new Block({
            timestamp: now,
            transactions,
            previousHash: previousBlock.hash,
            validator,
            signature
        });

        if (this.isValidBlock(newBlock, previousBlock)) {
            this.chain.push(newBlock);
            this.pendingTransactions.clear();
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
            return false;
        }

        if (block.previousHash !== previousBlock.hash) {
            return false;
        }

        if (block.timestamp <= previousBlock.timestamp) {
            return false;
        }

        return true;
    }

    /**
     * 验证整个链的有效性
     */
    isValidChain() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!this.isValidBlock(currentBlock, previousBlock)) {
                return false;
            }
        }
        return true;
    }

    /**
     * 替换链（在收到更长的有效链时）
     * @param {Array<Block>} newChain 
     */
    replaceChain(newChain) {
        // 新链必须更长
        if (newChain.length <= this.chain.length) {
            throw new Error('New chain must be longer');
        }

        // 验证新链
        for (let i = 1; i < newChain.length; i++) {
            const block = newChain[i];
            const previousBlock = newChain[i - 1];
            
            if (!this.isValidBlock(block, previousBlock)) {
                throw new Error('Invalid chain');
            }
        }

        // 替换链
        this.chain = newChain;
        // 清理交易池中已经包含在新链中的交易
        this.cleanTransactionPool(newChain);
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
            chain: this.chain.map(block => block.toJSON()),
            pendingTransactions: Array.from(this.pendingTransactions.values()).map(tx => tx.toJSON())
        };
    }
}

export default Chain; 