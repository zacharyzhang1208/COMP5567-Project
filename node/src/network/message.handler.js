import { BaseTransaction, UserRegistrationTransaction } from '../core/blockchain/transaction.js';
import Block from '../core/blockchain/block.js';
import Logger from '../utils/logger.js';

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
        this.logger = new Logger('MSG');
    }

    get chain() {
        return this.node.chain;
    }

    /**
     * 处理接收到的消息
     */
    handleMessage(message, sender) {
        // 检查消息发送者
        if (message.sender && message.sender.port === this.node.port) {
            this.logger.debug('Ignoring message from self');
            return;
        }

        this.logger.debug('Received message:', JSON.stringify(message));
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
                    this.handleHandshake(message.data);
                    break;
                default:
                    this.logger.warn(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            this.logger.error('Error handling message:', error);
            this.logger.debug('Message was:', message);
        }
    }

    /**
     * 处理新交易
     */
    handleNewTransaction(transaction) {
        try {
            // 传入的是JSON数据（来自网络消息），需要实例化
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
        } catch (error) {
            this.logger.error('Error handling new transaction:', error);
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
            this.logger.error('Error handling new block:', error);
        }
    }

    /**
     * 处理链请求
     */
    handleChainRequest(sender) {
        const data = {
            chain: this.node.chain.chainData,
            pendingTransactions: Array.from(this.node.chain.pendingTransactions.values())
        };
        this.logger.debug('Sending chain data in response to request');
        
        this.sendMessage(sender, {
            type: MESSAGE_TYPES.SEND_CHAIN,
            data: data
        });
    }

    /**
     * 处理链响应
     */
    handleChainResponse(chainData) {
        try {
            this.chain.replaceChain(chainData);
        } catch (error) {
            this.logger.error('Error handling chain response:', error);
        }
    }

    /**
     * 广播交易
     */
    broadcastTransaction(transaction) {
        this.logger.debug('Broadcasting transaction:', transaction);
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
        // 添加发送者标识
        const messageWithSender = {
            ...message,
            sender: {
                port: this.node.port
            }
        };
        this.node.peers.forEach(peer => {
            this.sendMessage(peer, messageWithSender);
        });
    }

    /**
     * 发送消息给指定节点
     */
    sendMessage(peer, message) {
        try {
            this.logger.debug('Sending message:', JSON.stringify(message));
            peer.send(JSON.stringify(message));
        } catch (error) {
            this.logger.error('Error sending message:', error);
        }
    }

    /**
     * 处理握手消息
     */
    handleHandshake(data) {
        const { address } = data;
        this.logger.info(`Received handshake from peer at ${address}`);

        // 不添加自己的地址
        if (address !== `ws://${this.node.p2pServer.host}:${this.node.port}`) {
            this.node.knownPeers.add(address);
        }
        this.logger.debug('Known peers:', Array.from(this.node.knownPeers));
    }
}

export default MessageHandler; 