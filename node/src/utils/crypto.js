import { createHash } from 'crypto';
import secp256k1 from 'secp256k1';

class CryptoUtil {
    /**
     * 根据用户ID和密码生成确定性密钥对
     * @param {string} userId - 用户ID
     * @param {string} password - 用户密码
     * @returns {Object} 包含公钥和私钥的对象
     */
    static generateKeyPair(userId, password) {
        try {
            // 生成确定性私钥 (32 bytes)
            let privateKey;
            do {
                const seed = createHash('sha256')
                    .update(`${userId}:${password}`)
                    .digest();
                privateKey = Buffer.from(seed);
            } while (!secp256k1.privateKeyVerify(privateKey));

            // 从私钥生成公钥 (65 bytes, uncompressed)
            const publicKey = Buffer.from(secp256k1.publicKeyCreate(privateKey, false));

            return {
                publicKey: publicKey.toString('hex'),
                privateKey: privateKey.toString('hex')
            };
        } catch (error) {
            console.error('Error generating key pair:', error);
            throw error;
        }
    }

    /**
     * 使用私钥对消息进行签名
     * @param {string} message - 要签名的消息
     * @param {string} privateKey - Hex 格式的私钥
     * @returns {string} Hex 格式的签名
     */
    static sign(message, privateKey) {
        const msgHash = createHash('sha256').update(message).digest();
        const privKey = Buffer.from(privateKey, 'hex');
        const { signature } = secp256k1.ecdsaSign(msgHash, privKey);
        return Buffer.from(signature).toString('hex');
    }

    /**
     * 使用公钥验证签名
     * @param {string} message - 原始消息
     * @param {string} signature - Hex 格式的签名
     * @param {string} publicKey - Hex 格式的公钥
     * @returns {boolean} 签名是否有效
     */
    static verify(message, signature, publicKey) {
        const msgHash = createHash('sha256').update(message).digest();
        const sig = Buffer.from(signature, 'hex');
        const pub = Buffer.from(publicKey, 'hex');
        return secp256k1.ecdsaVerify(sig, msgHash, pub);
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