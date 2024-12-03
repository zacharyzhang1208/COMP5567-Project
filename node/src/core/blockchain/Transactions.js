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
            signature: undefined, // 计算哈希时不包括签名
            hash: undefined      // 计算哈希时不包括哈希值
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

// 签到交易
export class AttendanceTransaction extends BaseTransaction {
    constructor({ studentId, courseId, location, ...rest }) {
        super('ATTENDANCE', rest);
        this.studentId = studentId;
        this.courseId = courseId;
        this.location = location;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            studentId: this.studentId,
            courseId: this.courseId,
            location: this.location
        };
    }
}

// 课程创建交易
export class CourseTransaction extends BaseTransaction {
    constructor({ teacherId, courseName, courseTime, ...rest }) {
        super('COURSE_CREATE', rest);
        this.teacherId = teacherId;
        this.courseName = courseName;
        this.courseTime = courseTime;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            teacherId: this.teacherId,
            courseName: this.courseName,
            courseTime: this.courseTime
        };
    }
}

// 统一导出
export default {
    BaseTransaction,
    AttendanceTransaction,
    CourseTransaction
}; 