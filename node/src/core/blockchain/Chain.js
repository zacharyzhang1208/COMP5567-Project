import { Level } from 'level';
import path from 'path';
import fs from 'fs';
import Block from './block.js';

class Chain {
    constructor(node) {
        this.node = node;
        // 使用端口号来区分不同节点的数据目录
        const nodeDataDir = path.join(process.cwd(), '.data', `node-${this.node.port}`);
        
        // 确保节点特定的数据目录存在
        if (!fs.existsSync(nodeDataDir)) {
            fs.mkdirSync(nodeDataDir, { recursive: true });
        }

        // 初始化数据库
        const dbPath = path.join(nodeDataDir, 'chain');
        this.db = new Level(dbPath);

        this.chain = [];
        this.pendingTransactions = new Map();
        this.chainDataDir = nodeDataDir;
        this.chainFilePath = path.join(this.chainDataDir, 'chain.json');
        this.loadChain();
    }

    saveChain() {
        // 确保数据目录存在
        if (!fs.existsSync(this.chainDataDir)) {
            fs.mkdirSync(this.chainDataDir, { recursive: true });
        }
        // 保存链数据到文件
        fs.writeFileSync(this.chainFilePath, JSON.stringify(this.chain.map(block => block.toJSON()), null, 2));
    }

    loadChain() {
        if (fs.existsSync(this.chainFilePath)) {
            const chainData = JSON.parse(fs.readFileSync(this.chainFilePath, 'utf8'));
            this.chain = chainData.map(data => new Block(data));
        } else {
            console.log("no chain data file, create a new genesis block");
            this.chain = [this.createGenesisBlock()]; // 如果没有数据文件，创建创世区块
        }
    }

    /**
     * 创建创世区块
     */
    createGenesisBlock() {
        return new Block({
            timestamp: Date.now(),
            transactions: [],
            previousHash: '0',
            validator: 'genesis',
            signature: ''
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
            this.chain.push(newBlock);
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
     * @param {Object} chainData 包含 chain 和 pendingTransactions
     */
    replaceChain(chainData) {
        const { chain: newChain, pendingTransactions } = chainData;

        // 将 JSON 数据转换为 Block 对象
        const newBlockChain = newChain.map(blockData => new Block(blockData));

        // 新链必须更长
        if (newBlockChain.length < this.chain.length) {
            throw new Error('New chain must be longer');
        }
        // 新链长度与当前链相同，忽略
        else if (newBlockChain.length === this.chain.length) { 
            console.log('New chain is the same length as current chain, ignore');
            return;
        }
        // 验证新链
        else{
            for (let i = 1; i < newBlockChain.length; i++) {
                const block = newBlockChain[i];
                const previousBlock = newBlockChain[i - 1];
                if (!this.isValidBlock(block, previousBlock)) {
                    throw new Error('Invalid chain');
                }
            }
        }

        // 替换链
        this.chain = newBlockChain;
        
        // 更新待处理交易池
        this.pendingTransactions.clear();
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
            chain: this.chain.map(block => block.toJSON()),
            pendingTransactions: Array.from(this.pendingTransactions.values()).map(tx => tx.toJSON())
        };
    }
}

export default Chain; 