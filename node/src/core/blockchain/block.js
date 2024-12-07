import { createHash } from 'crypto';
import { UserRegistrationTransaction } from './transaction.js';
import CryptoUtil from '../../utils/crypto.js';

class Block {
    // 生成固定的管理员密钥对
    static ADMIN_KEYS = CryptoUtil.generateKeyPair('admin', 'admin_password');

    // 定义管理员信息
    static ADMIN_INFO = {
        id: 'admin',
        publicKey: Block.ADMIN_KEYS.publicKey,
        privateKey: Block.ADMIN_KEYS.privateKey,
        role: 'ADMIN'
    };

    // 定义统一的创世区块
    static GENESIS_BLOCK = (() => {
        // 创建管理员注册交易
        const encryptedPrivateKeyHash = CryptoUtil.hash(
            CryptoUtil.encrypt(Block.ADMIN_INFO.privateKey, 'admin_password')
        );

        const adminRegTx = new UserRegistrationTransaction({
            userId: Block.ADMIN_INFO.id,
            userType: Block.ADMIN_INFO.role,
            publicKey: Block.ADMIN_INFO.publicKey,
            encryptedPrivateKeyHash: encryptedPrivateKeyHash,
            timestamp: 1701676800000,  // 2023-12-04 12:00:00 UTC
            signature: ''
        });

        const signature = CryptoUtil.sign(adminRegTx.hash, Block.ADMIN_INFO.privateKey);
        adminRegTx.signature = signature;

        // 创建创世区块
        const block = new Block({
            timestamp: 1701676800000,  // 2023-12-04 12:00:00 UTC
            transactions: [adminRegTx],  // 包含管理员注册交易
            previousHash: '0',
            validatorId: 'genesis',
            validatorPubKey: '',
            signature: ''
        });

        block.hash = block.calculateHash();
        return block;
    })();

    constructor({
        timestamp,
        transactions,
        previousHash,
        validatorId,
        validatorPubKey,
        signature
    }) {
        this.timestamp = timestamp || Date.now();
        this.transactions = transactions || [];
        this.previousHash = previousHash || '0';
        this.validatorId = validatorId || '';
        this.validatorPubKey = validatorPubKey || '';
        this.signature = signature || '';
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
            validatorId: this.validatorId,
            validatorPubKey: this.validatorPubKey
        };
        
        return createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }

    /**
     * 验证区块中的所有交易
     * @returns {boolean}
     */
    validateTransactions() {

        return this.transactions.every(transaction => {
            // 基本的交易验证
            if (!transaction.hash || transaction.hash !== transaction.calculateHash()) {
                return false;
            }
            
            // 根据交易类型进行特定验证
            switch (transaction.type) {
                case 'USER_REGISTRATION':
                    return this.validateUserRegistration(transaction);
                case 'COURSE_CREATE':
                    return this.validateCourseCreation(transaction);
                case 'COURSE_ENROLLMENT':
                    return this.validateCourseEnrollment(transaction);
                case 'PUBLISH_ATTENDANCE':
                    return this.validatePublishAttendance(transaction);
                case 'SUBMIT_ATTENDANCE':
                    return this.validateSubmitAttendance(transaction);
                default:
                    return false;
            }
        });
    }

    /**
     * 验证用户注册交易
     */
    validateUserRegistration(transaction) {
        return (
            transaction instanceof UserRegistrationTransaction &&
            transaction.userId &&
            transaction.userType &&
            transaction.publicKey &&
            ['TEACHER', 'STUDENT'].includes(transaction.userType)
        );
    }

    /**
     * 验证课程创建交易
     */
    validateCourseCreation(transaction) {
        return (
            transaction instanceof Transactions.CourseCreationTransaction &&
            transaction.courseId &&
            transaction.teacherId &&
            transaction.courseName
        );
    }

    /**
     * 验证选课交易
     */
    validateCourseEnrollment(transaction) {
        return (
            transaction instanceof Transactions.CourseEnrollmentTransaction &&
            transaction.studentId &&
            transaction.courseId
        );
    }

    /**
     * 验证发布签到交易
     */
    validatePublishAttendance(transaction) {
        return (
            transaction instanceof Transactions.PublishAttendanceTransaction &&
            transaction.courseId &&
            transaction.teacherId &&
            transaction.validPeriod &&
            transaction.verificationCode &&
            transaction.verificationCode.length === 6
        );
    }

    /**
     * 验证提交签到交易
     */
    validateSubmitAttendance(transaction) {
        return (
            transaction instanceof Transactions.SubmitAttendanceTransaction &&
            transaction.studentId &&
            transaction.courseId &&
            transaction.verificationCode &&
            transaction.verificationCode.length === 6
        );
    }

    /**
     * 验证区块的有效性
     */
    isValid() {
        // 验证哈希值
        if (this.hash !== this.calculateHash()) {
            return false;
        }

        // 验证所有交易
        if (!this.validateTransactions()) {
            console.log("transactions are not valid");
            return false;
        }

        // 验证签名（如果有）
        if (this.signature && this.validatorPubKey) {
            return CryptoUtil.verify(this.hash, this.signature, this.validatorPubKey);
        }

        return true;
    }

    toJSON() {
        return {
            timestamp: this.timestamp,
            transactions: this.transactions,
            previousHash: this.previousHash,
            validatorId: this.validatorId,
            validatorPubKey: this.validatorPubKey,
            signature: this.signature,
            hash: this.hash
        };
    }
}

export default Block; 