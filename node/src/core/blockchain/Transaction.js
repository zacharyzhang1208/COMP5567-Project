import { createHash } from 'crypto';

class Transaction {
    constructor({
        type,
        studentId,
        courseId,
        timestamp,
        location,
        signature,
        teacherId,
        courseName,
        courseTime
    }) {
        this.type = type;
        this.timestamp = timestamp || Date.now();
        this.signature = signature;
        
        switch(type) {
            case 'ATTENDANCE':
                this.studentId = studentId;
                this.courseId = courseId;
                this.location = location;
                break;
            case 'COURSE_CREATE':
                this.teacherId = teacherId;
                this.courseId = courseId;
                this.courseName = courseName;
                this.courseTime = courseTime;
                break;
            // ... 其他类型的处理
        }
        
        this.hash = this.calculateHash();
    }

    /**
     * 计算交易的哈希值
     * @returns {string} 交易的哈希值
     */
    calculateHash() {
        const data = {
            type: this.type,
            studentId: this.studentId,
            courseId: this.courseId,
            timestamp: this.timestamp,
            location: this.location
        };

        return createHash('sha256')
            .update(JSON.stringify(data))
            .digest('hex');
    }

    /**
     * 验证交易的有效性
     * @returns {boolean} 交易是否有效
     */
    isValid() {
        // 基本字段验证
        if (!this.studentId || !this.courseId || !this.timestamp || !this.location) {
            return false;
        }

        // 验证哈希值
        if (this.hash !== this.calculateHash()) {
            return false;
        }

        // TODO: 添加签名验证逻辑
        return true;
    }

    /**
     * 将交易转换为JSON格式
     * @returns {Object} 交易的JSON表示
     */
    toJSON() {
        return {
            type: this.type,
            studentId: this.studentId,
            courseId: this.courseId,
            timestamp: this.timestamp,
            location: this.location,
            signature: this.signature,
            hash: this.hash
        };
    }
}

export default Transaction; 