import { ethers } from 'ethers';
import { createHash } from 'crypto';

/**
 * 根据用户ID和密码生成密钥对
 * @param {string} userId - 用户ID
 * @param {string} password - 用户密码
 * @returns {Object} 包含公钥和私钥的对象
 */
export const generateKeyPairs = (userId, password) => {
    try {
        // 组合userId和password生成确定性种子
        const seed = createHash('sha256')
            .update(`${userId}:${password}`)
            .digest('hex');
        
        // 使用种子生成私钥
        const privateKey = '0x' + seed;
        
        // 从私钥计算公钥
        const publicKey = ethers.utils.computeAddress(privateKey);

        return {
            publicKey,
            privateKey
        };
    } catch (error) {
        console.error('Error generating key pairs:', error);
        throw error;
    }
};

export default generateKeyPairs;
