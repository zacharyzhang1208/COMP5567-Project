import { UserRegistrationTransaction, CourseCreationTransaction } from '../core/blockchain/transactions.js';
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
    handleNewTransaction(transactionData) {
        console.log("transactionData in handleNewTransaction",transactionData)
        try {
            // 根据交易类型创建对应的交易实例
            let transaction;
            switch (transactionData.type) {
                case 'USER_REGISTRATION':
                    transaction = new UserRegistrationTransaction(transactionData);
                    break;
                case 'COURSE_CREATE':
                    transaction = new CourseCreationTransaction(transactionData);
                    break;
                case 'COURSE_ENROLLMENT':
                    transaction = new Transactions.CourseEnrollmentTransaction(transactionData);
                    break;
                case 'PUBLISH_ATTENDANCE':
                    transaction = new Transactions.PublishAttendanceTransaction(transactionData);
                    break;
                case 'SUBMIT_ATTENDANCE':
                    transaction = new Transactions.SubmitAttendanceTransaction(transactionData);
                    break;
                default:
                    throw new Error(`Unknown transaction type: ${transactionData.type}`);
            }

            if (!transaction.isValid()) {
                throw new Error('Transaction is invalid');
            }

            // 添加到待处理交易池
            this.node.chain.addTransaction(transaction);

            // 广播给其他节点
            this.broadcastTransaction(transaction);
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