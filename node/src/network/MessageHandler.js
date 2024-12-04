import { BaseTransaction, UserRegistrationTransaction, CourseCreationTransaction } from '../core/blockchain/Transactions.js';
import Block from '../core/blockchain/Block.js';
import WebSocket from 'ws';

// test 12.4 17:40
// 定义消息类型
export const MESSAGE_TYPES = {
    NEW_TRANSACTION: 'NEW_TRANSACTION',
    NEW_BLOCK: 'NEW_BLOCK',
    REQUEST_CHAIN: 'REQUEST_CHAIN',
    SEND_CHAIN: 'SEND_CHAIN',
    HANDSHAKE: 'HANDSHAKE',
    HANDSHAKE_RESPONSE: 'HANDSHAKE_RESPONSE'
};

class MessageHandler {
    constructor(node) {
        this.node = node;  // TeacherNode 实例
    }

    get chain() {
        return this.node.chain;
    }

    /**
     * 处理接收到的消息
     */
    handleMessage(message, sender) {
        console.log(`[P2P] Received message: ${JSON.stringify(message)}`);
        try {
            switch (message.type) {
                case MESSAGE_TYPES.NEW_TRANSACTION:
                    this.handleNewTransaction(message.data);
                    break;
                case MESSAGE_TYPES.NEW_BLOCK:
                    this.handleNewBlock(message.data);
                    break;
                case MESSAGE_TYPES.REQUEST_CHAIN:
                    this.handleChainRequest(sender);
                    break;
                case MESSAGE_TYPES.SEND_CHAIN:
                    this.handleChainResponse(message.data);
                    break;
                case MESSAGE_TYPES.HANDSHAKE:
                    this.handleHandshake(message.data, sender);
                    break;
                case MESSAGE_TYPES.HANDSHAKE_RESPONSE:
                    this.handleHandshakeResponse(message.data);
                    break;
                default:
                    console.warn(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            console.error('Message was:', message);
        }
    }

    /**
     * 处理新交易
     */
    handleNewTransaction(transaction) {
        try {
            // 如果传入的是已经实例化的交易对象
            if (transaction instanceof BaseTransaction) {
                if (!transaction.isValid()) {
                    throw new Error('Transaction is invalid');
                }
                this.chain.addTransaction(transaction);
                this.broadcastTransaction(transaction);
                return;
            }

            // 如果传入的是JSON数据（来自网络消息），则需要实例化
            let newTransaction;
            switch (transaction.type) {
                case 'USER_REGISTRATION':
                    newTransaction = new UserRegistrationTransaction(transaction);
                    break;
                // ... 其他 case
            }
            
            if (!newTransaction.isValid()) {
                throw new Error('Transaction is invalid');
            }
            this.chain.addTransaction(newTransaction);
            this.broadcastTransaction(newTransaction);
        } catch (error) {
            console.error('Error handling new transaction:', error);
        }
    }

    /**
     * 处理新区块
     */
    handleNewBlock(blockData) {
        try {
            const block = new Block(blockData);
            if (block.isValid()) {
                this.chain.addBlock(block);
                // 广播给其他节点
                this.broadcastBlock(block);
            }
        } catch (error) {
            console.error('Error handling new block:', error);
        }
    }

    /**
     * 处理链请求
     */
    handleChainRequest(sender) {
        const chainData = this.chain.toJSON();
        this.sendMessage(sender, {
            type: MESSAGE_TYPES.SEND_CHAIN,
            data: chainData
        });
    }

    /**
     * 处理链响应
     */
    handleChainResponse(chainData) {
        try {
            // 验证并可能替换当前链
            console.log("chainData", chainData);
            this.chain.replaceChain(chainData);
        } catch (error) {
            console.error('Error handling chain response:', error);
        }
    }

    /**
     * 广播交易
     */
    broadcastTransaction(transaction) {
        this.broadcast({
            type: MESSAGE_TYPES.NEW_TRANSACTION,
            data: transaction.toJSON()
        });
    }

    /**
     * 广播区块
     */
    broadcastBlock(block) {
        this.broadcast({
            type: MESSAGE_TYPES.NEW_BLOCK,
            data: block
        });
    }

    /**
     * 广播消息给所有节点
     */
    broadcast(message) {
        this.node.peers.forEach(peer => {
            this.sendMessage(peer, message);
        });
    }

    /**
     * 发送消息给指定节点
     */
    sendMessage(peer, message) {
        try {
            console.log(`[P2P] Sending message: ${JSON.stringify(message)}`);
            peer.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    /**
     * 处理握手消息
     */
    handleHandshake(data, sender) {
        const { port } = data;
        console.log(`[P2P] Received handshake from peer on port ${port}`);

        // 记录新的对等节点
        this.node.knownPeers.add(`ws://localhost:${port}`);
        console.log(`[P2P] Current known peers: ${Array.from(this.node.knownPeers)}`);

        // 发送握手响应
        console.log(`[P2P] Sending handshake response to peer on port ${port}`);
        this.sendMessage(sender, {
            type: MESSAGE_TYPES.HANDSHAKE_RESPONSE,
            data: {
                port: this.node.port,
                peers: Array.from(this.node.knownPeers)
            }
        });

        // 请求区块链数据
        console.log(`[P2P] Requesting chain from peer on port ${port}`);
        this.sendMessage(sender, {
            type: MESSAGE_TYPES.REQUEST_CHAIN
        });
    }

    /**
     * 处理握手响应
     */
    handleHandshakeResponse(data) {
        const { port, peers } = data;
        console.log(`[P2P] Received handshake response from peer on port ${port}`);

        // 添加新的已知节点
        peers.forEach(peerAddress => {
            if (!this.node.knownPeers.has(peerAddress)) {
                this.node.knownPeers.add(peerAddress);
                // 尝试连接到新发现的节点
                this.node.connectToPeer(peerAddress);
            }
        });
    }
}

export default MessageHandler; 