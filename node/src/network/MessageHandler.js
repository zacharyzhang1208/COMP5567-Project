import { BaseTransaction, UserRegistrationTransaction, CourseCreationTransaction } from '../core/blockchain/Transactions.js';
import Block from '../core/blockchain/Block.js';

// 定义消息类型
export const MESSAGE_TYPES = {
    NEW_TRANSACTION: 'NEW_TRANSACTION',
    NEW_BLOCK: 'NEW_BLOCK',
    REQUEST_CHAIN: 'REQUEST_CHAIN',
    SEND_CHAIN: 'SEND_CHAIN'
};

class MessageHandler {
    constructor(node) {
        this.node = node;  // TeacherNode 实例
    }

    /**
     * 处理接收到的消息
     */
    handleMessage(message, sender) {
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
                default:
                    console.warn(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    /**
     * 处理新交易
     */
    handleNewTransaction(transaction) {
        try {
            // 如果传入的是已经实例化的交易对象
            console.log("transaction instanceof BaseTransaction is", transaction instanceof BaseTransaction);
            if (transaction instanceof BaseTransaction) {
                if (!transaction.isValid()) {
                    throw new Error('Transaction is invalid');
                }
                this.node.chain.addTransaction(transaction);
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
            this.node.chain.addTransaction(newTransaction);
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
                this.node.chain.addBlock(block);
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
        const chainData = this.node.chain.toJSON();
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
            this.node.chain.replaceChain(chainData);
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
            peer.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
}

export default MessageHandler; 