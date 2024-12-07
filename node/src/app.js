import TeacherNode from './core/node/teacher.node.js';
import PortUtils from './utils/port.js';

// 在应用最开始就注册退出处理
process.on('exit', () => {
    try {
        console.log('\n[Port] Cleaning up port locks...');
        PortUtils.cleanupLocks();
        console.log('[Port] Port locks cleaned up');
    } catch (error) {
        console.error('[Port] Error cleaning up locks:', error);
    }
});

process.on('SIGINT', () => {
    console.log('\n[Port] Received SIGINT, cleaning up...');
    PortUtils.cleanupLocks();
});

// 启动教师节点
TeacherNode.startNode().catch(error => {
    console.error('Failed to start node:', error);
    if (error.message === 'Login failed') {
        console.log('Please try to restart the application.');
    }
    process.exit(1);
});

export default TeacherNode;

