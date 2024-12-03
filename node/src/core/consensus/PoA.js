class PoAConsensus {
    constructor() {
        // 初始化验证者集合
        this.validators = new Set();
    }

    /**
     * 添加验证者（教师）
     * @param {string} validatorAddress 教师的地址
     */
    addValidator(validatorAddress) {
        this.validators.add(validatorAddress);
    }

    /**
     * 移除验证者
     * @param {string} validatorAddress 教师的地址
     */
    removeValidator(validatorAddress) {
        this.validators.delete(validatorAddress);
    }

    /**
     * 检查是否是验证者
     * @param {string} address 要检查的地址
     * @returns {boolean}
     */
    isValidator(address) {
        return this.validators.has(address);
    }

    /**
     * 验证区块
     * @param {Block} block 要验证的区块
     * @returns {boolean}
     */
    validateBlock(block) {
        // 检查区块验证者是否是合法的教师节点
        if (!this.isValidator(block.validator)) {
            return false;
        }

        // 验证区块签名
        if (!block.isValid()) {
            return false;
        }

        return true;
    }
}

export default PoAConsensus; 