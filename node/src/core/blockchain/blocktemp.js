import { createHash } from 'crypto';
import Transactions from './transaction.js';
import CryptoUtil from '../../utils/crypto.js';

class Block {
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
        console.log("data in calculateHash",data);
        
        const result = createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
        console.log("result in calculateHash",result);
        return result;
    }

    /**
     * 验证区块中的所有交易
     * @returns {boolean}
     */
    validateTransactions() {

        return this.transactions.every(transaction => {
            // 基本的交易验证
            if (!transaction.hash || transaction.hash !== transaction.calculateHash()) {
                console.log("c3");
                console.log("transaction is not valid", transaction.hash, transaction.calculateHash());
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
            transaction instanceof Transactions.UserRegistrationTransaction &&
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