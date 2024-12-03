class PermissionManager {
    constructor() {
        this.permissions = new Map();
    }

    // 添加权限
    addPermission(userId, permission) {
        if (!this.permissions.has(userId)) {
            this.permissions.set(userId, new Set());
        }
        this.permissions.get(userId).add(permission);
    }

    // 检查权限
    hasPermission(userId, permission) {
        return this.permissions.get(userId)?.has(permission) || false;
    }

    // 设置用户类型（同时设置对应权限）
    setUserType(userId, type) {
        if (type === 'TEACHER') {
            this.addPermission(userId, 'CREATE_COURSE');
            this.addPermission(userId, 'PUBLISH_ATTENDANCE');
            this.addPermission(userId, 'VALIDATE_ATTENDANCE');
        } else if (type === 'STUDENT') {
            this.addPermission(userId, 'JOIN_COURSE');
            this.addPermission(userId, 'SUBMIT_ATTENDANCE');
        }
    }
}

export default PermissionManager; 