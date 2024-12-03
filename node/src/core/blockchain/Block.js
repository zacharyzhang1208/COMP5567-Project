import { ethers } from 'ethers';
import { createHash } from 'crypto';

class Block {
    constructor({
        timestamp,
        transactions,
        previousHash,
        validator,
        signature
    }) {
        this.timestamp = timestamp || Date.now();
        this.transactions = transactions || [];
        this.previousHash = previousHash || '0';
        this.validator = validator || ''; // 验证者地址
        this.signature = signature || ''; // 验证者签名
        this.hash = this.calculateHash();
    }

    /**
     * 计算区块的哈希值
     * @returns {string} 区块的哈希值
     */
    calculateHash() {
        const data = {
            timestamp: this.timestamp,
            transactions: this.transactions,
            previousHash: this.previousHash,
            validator: this.validator
        };
        
        return createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }

    /**
     * 验证区块的有效性
     * @returns {boolean} 区块是否有效
     */
    isValid() {
        // 验证哈希值
        if (this.hash !== this.calculateHash()) {
            return false;
        }

        // 验证签名（如果有）
        if (this.signature && this.validator) {
            try {
                const signerAddr = ethers.utils.verifyMessage(this.hash, this.signature);
                return signerAddr.toLowerCase() === this.validator.toLowerCase();
            } catch {
                return false;
            }
        }

        return true;
    }
}

export default Block; 