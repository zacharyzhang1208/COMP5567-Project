import ApiServer from './core/node/api server.js';

// 启动api服务器
ApiServer.startNode().catch(error => {
    console.error('Failed to start node:', error);
    if (error.message === 'Login failed') {
        console.log('Please try to restart the application.');
    }
    process.exit(1);
});

export default ApiServer;