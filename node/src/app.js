import { WebSocketServer } from 'ws';
import Chain from './core/blockchain/Chain.js';
import MessageHandler from './network/MessageHandler.js';
import { UserRegistrationTransaction, CourseCreationTransaction } from './core/blockchain/Transactions.js';
import CryptoUtil from './utils/crypto.js';

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
        const { publicKey, privateKey } = CryptoUtil.generateKeyPair('user1', 'password');
        console.log("publicKey is", publicKey);
        console.log("privateKey is", privateKey);
        
        const userRegTx = new UserRegistrationTransaction({
            userId: 'user1',
            userType: 'TEACHER',
            publicKey: publicKey
        });

        console.log("userRegTx is", userRegTx);

        this.messageHandler.handleNewTransaction(userRegTx);

        const newBlock = this.chain.createBlock('user1', 'signature123');
        console.log('New Block Created:', newBlock);

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

