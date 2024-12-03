import { WebSocketServer } from 'ws';
import Chain from './core/blockchain/Chain.js';
import MessageHandler from './network/MessageHandler.js';
import { UserRegistrationTransaction, CourseCreationTransaction } from './core/blockchain/Transactions.js';

class TeacherNode {
    constructor() {
        this.chain = new Chain();  // 区块链实例
        this.messageHandler = new MessageHandler(this);  // 消息处理器实例
        this.peers = new Set();  // 连接的节点集合
        this.setupP2PServer();  // 设置 P2P 服务器
    }

    setupP2PServer() {
        const server = new WebSocketServer({ port: 6001 });
        server.on('connection', socket => {
            console.log('New peer connected');
            this.peers.add(socket);
            socket.on('message', message => {
                this.messageHandler.handleMessage(JSON.parse(message), socket);
            });
            socket.on('close', () => {
                this.peers.delete(socket);
                console.log('Peer disconnected');
            });
            socket.on('error', error => {
                console.error('WebSocket error:', error);
            });
        });
        console.log('P2P Server running on port 6001');
    }

    broadcastMessage(message) {
        this.peers.forEach(peer => {
            peer.send(JSON.stringify(message));
        });
    }

    start() {
        // 创建创世区块
        console.log("Creating genesis block...");
        const genesisBlock = this.chain.createGenesisBlock();
        console.log("Genesis block created:", genesisBlock);

        // 模拟一些交易
        const userRegTx = new UserRegistrationTransaction({
            userId: 'user1',
            userType: 'TEACHER',
            publicKey: 'abc123'
        });

        const courseCreationTx = new CourseCreationTransaction({
            courseId: 'course1',
            teacherId: 'user1',
            courseName: 'Blockchain 101'
        });
        console.log("userRegTx", userRegTx);
        console.log("courseCreationTx", courseCreationTx);

        // 处理并广播交易
        this.messageHandler.handleNewTransaction(userRegTx);
        this.messageHandler.handleNewTransaction(courseCreationTx);

        // 创建一个新区块
        console.log("try to create a new block", this.chain);
        const newBlock = this.chain.createBlock('user1', 'signature123');
        console.log('New Block Created:', newBlock);

        // 验证区块链的完整性
        if (this.chain.isValidChain()) {
            console.log('Blockchain is valid');
        } else {
            console.log('Blockchain is not valid');
        }
    }
}

const node = new TeacherNode();
node.start();

export default TeacherNode;

