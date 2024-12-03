import { createHash } from 'crypto';

// 基础交易类
export class BaseTransaction {
    constructor(type, { timestamp, signature } = {}) {
        this.type = type;
        this.timestamp = timestamp || Date.now();
        this.signature = signature;
        this.hash = this.calculateHash();
    }

    calculateHash() {
        const data = {
            ...this.toJSON(),
            signature: undefined,
            hash: undefined
        };
        
        return createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
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
    constructor({ userId, userType, publicKey, ...rest }) {
        super('USER_REGISTRATION', rest);
        this.userId = userId;
        this.userType = userType;  // 'TEACHER' 或 'STUDENT'
        this.publicKey = publicKey;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            userId: this.userId,
            userType: this.userType,
            publicKey: this.publicKey
        };
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