import CryptoUtil from '../../utils/crypto.js';

// 基础交易类
export class BaseTransaction {
    constructor(type, { timestamp, signature } = {}) {
        this.type = type;
        this.timestamp = timestamp === undefined ? Date.now() : timestamp;
        this.signature = signature;
        // 基类的哈希计算，由子类负责
    }

    // 抽象方法，强制子类实现
    calculateHash() {
        throw new Error('calculateHash method must be implemented by child class');
    }

    // 基础的验证逻辑
    isValid() {
        if (!this.type || !this.timestamp) {
            return false;
        }

        if (!this.hash) {  // 确保子类计算了哈希
            return false;
        }

        if (this.hash !== this.calculateHash()) {
            return false;
        }

        return true;
    }

    toJSON() {
        return {
            type: this.type,
            timestamp: this.timestamp,
            signature: this.signature,
            hash: this.hash
        };
    }
}

// 用户注册交易
export class UserRegistrationTransaction extends BaseTransaction {
    constructor({ userId, userType, publicKey, encryptedPrivateKeyHash, ...rest }) {
        super('USER_REGISTRATION', rest);
        
        this.userId = userId;
        this.userType = userType;
        this.publicKey = publicKey;
        this.encryptedPrivateKeyHash = encryptedPrivateKeyHash;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        return CryptoUtil.hash(
            this.type +
            this.userId +
            this.userType +
            this.publicKey +
            this.encryptedPrivateKeyHash +
            this.timestamp
        );
    }

    // 可以选择重写 isValid 方法来添加特定的验证逻辑
    isValid() {
        return super.isValid() && 
               this.userId && 
               this.userType && 
               this.publicKey && 
               ['TEACHER', 'STUDENT'].includes(this.userType);
    }

    toJSON() {
        return {
            ...super.toJSON(),
            userId: this.userId,
            userType: this.userType,
            publicKey: this.publicKey,
            encryptedPrivateKeyHash: this.encryptedPrivateKeyHash  // 包含在序列化中
        };
    }

    // 静态方法：在区块链中查找用户注册交易
    static findByUsername(chain, username) {
        for (const block of chain.chainData) {
            for (const tx of block.transactions) {
                if (tx.type === 'USER_REGISTRATION' && tx.userId === username) {
                    return tx;
                }
            }
        }
        return null;
    }
}

// 课程创建交易
export class CourseCreationTransaction extends BaseTransaction {
    constructor({ courseId, teacherId, courseName, ...rest }) {
        super('COURSE_CREATE', rest);
        this.courseId = courseId;
        this.teacherId = teacherId;
        this.courseName = courseName;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            courseId: this.courseId,
            teacherId: this.teacherId,
            courseName: this.courseName
        };
    }
}

// 选课交易
export class CourseEnrollmentTransaction extends BaseTransaction {
    constructor({ studentId, courseId, ...rest }) {
        super('COURSE_ENROLLMENT', rest);
        this.studentId = studentId;
        this.courseId = courseId;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            studentId: this.studentId,
            courseId: this.courseId
        };
    }
}

// 发布签到交易
export class PublishAttendanceTransaction extends BaseTransaction {
    constructor({ courseId, teacherId, validPeriod, ...rest }) {
        super('PUBLISH_ATTENDANCE', rest);
        this.courseId = courseId;
        this.teacherId = teacherId;
        this.validPeriod = validPeriod;  // 签到有效期
        this.verificationCode = this.generateVerificationCode();  // 生成6位验证码
    }

    // 生成6位验证码
    generateVerificationCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            courseId: this.courseId,
            teacherId: this.teacherId,
            validPeriod: this.validPeriod,
            verificationCode: this.verificationCode
        };
    }
}

// 签到交易
export class SubmitAttendanceTransaction extends BaseTransaction {
    constructor({ studentId, courseId, verificationCode, timestamp, ...rest }) {
        super('SUBMIT_ATTENDANCE', rest);
        this.studentId = studentId;
        this.courseId = courseId;
        this.verificationCode = verificationCode;  // 学生输入的验证码
        this.timestamp = timestamp || Date.now();
    }

    toJSON() {
        return {
            ...super.toJSON(),
            studentId: this.studentId,
            courseId: this.courseId,
            verificationCode: this.verificationCode,
            timestamp: this.timestamp
        };
    }

    // 验证签到码
    verifyCode(publishedCode) {
        return this.verificationCode === publishedCode;
    }
}

export default {
    BaseTransaction,
    UserRegistrationTransaction,
    CourseCreationTransaction,
    CourseEnrollmentTransaction,
    PublishAttendanceTransaction,
    SubmitAttendanceTransaction
}; 