import { createHash, createHmac } from 'crypto';

class CryptoUtil {
    /**
     * 根据用户ID和密码生成密钥对
     * @param {string} userId - 用户ID
     * @param {string} password - 用户密码
     * @returns {Object} 包含公钥和私钥的对象
     */
    static generateKeyPair(userId, password) {
        try {
            // 生成一个确定性的密钥
            const key = createHash('sha256')
                .update(`${userId}:${password}`)
                .digest('hex');
            
            return {
                publicKey: key,  // 在我们的简化系统中，公钥和私钥相同
                privateKey: key
            };
        } catch (error) {
            console.error('Error generating key pair:', error);
            throw error;
        }
    }

    /**
     * 使用私钥对消息进行签名
     * @param {string} message - 要签名的消息
     * @param {string} privateKey - 私钥
     * @returns {string} 签名
     */
    static sign(message, privateKey) {
        return createHmac('sha256', privateKey)
            .update(message)
            .digest('hex');
    }

    /**
     * 验证签名
     * @param {string} message - 原始消息
     * @param {string} signature - 签名
     * @param {string} publicKey - 公钥
     * @returns {boolean} 签名是否有效
     */
    static verify(message, signature, publicKey) {
        // 在我们的简化系统中，公钥和私钥是相同的
        const expectedSignature = this.sign(message, publicKey);
        return expectedSignature === signature;
    }

    /**
     * 生成消息的哈希值
     * @param {string} message - 消息
     * @returns {string} 哈希值
     */
    static hash(message) {
        return createHash('sha256')
            .update(message)
            .digest('hex');
    }
}

export default CryptoUtil; 