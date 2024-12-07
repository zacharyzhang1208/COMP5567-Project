import { BaseTransaction, UserRegistrationTransaction } from '../core/blockchain/transaction.js';
import Block from '../core/blockchain/block.js';
import Logger from '../utils/logger.js';

// 定义消息类型
export const MESSAGE_TYPES = {
    NEW_TRANSACTION: 'NEW_TRANSACTION',
    NEW_BLOCK: 'NEW_BLOCK',
    REQUEST_CHAIN: 'REQUEST_CHAIN',
    SEND_CHAIN: 'SEND_CHAIN',
    REQUEST_POOL: 'REQUEST_POOL',
    SEND_POOL: 'SEND_POOL',
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
        this.logger.info(`Received message type: ${message.type}`);
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
                case MESSAGE_TYPES.REQUEST_POOL:
                    this.handlePoolRequest(sender);
                    break;
                case MESSAGE_TYPES.SEND_POOL:
                    this.handlePoolResponse(message.data);
                    break;
                case MESSAGE_TYPES.HANDSHAKE:
                    this.handleHandshake(message.data);
                    break;
                default:
                    this.logger.warn(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            this.logger.error('Error handling message:', error);
            this.logger.error('Message was:', message);
        }
    }

    /**
     * 处理新交易
     */
    handleNewTransaction(transaction) {
        try {
            
            // 传入的是JSON数据（来自网络消息），需要实例化
            let newTransaction;
            console.log("transaction.type:", transaction.type);
            switch (transaction.type) {
                case 'USER_REGISTRATION':
                    console.log("Handleing new transaction");
                    newTransaction = new UserRegistrationTransaction(transaction);
                    break;
                // ... 其他 case
            }
            
            if (!newTransaction.isValid()) {
                throw new Error('Transaction is invalid');
            }
            
            this.chain.addTransaction(newTransaction);
            this.chain.saveChain();
            console.log("pendingTransactions.size:", this.chain.pendingTransactions.size);
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
        const chainData = {
            chain: this.node.chain.chainData
        };
        
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
            const { chain } = chainData;
            this.chain.replaceChain(chain);
        } catch (error) {
            this.logger.error('Error handling chain response:', error);
        }
    }

    /**
     * 处理交易池请求
     */
    handlePoolRequest(sender) {
        const poolData = {
            transactions: Array.from(this.node.chain.pendingTransactions.values())
        };
        
        this.sendMessage(sender, {
            type: MESSAGE_TYPES.SEND_POOL,
            data: poolData
        });
    }

    /**
     * 处理交易池响应
     */
    handlePoolResponse(poolData) {
        try {
            const { transactions } = poolData;

            transactions.forEach(txData => {
                try {
                    // 根据交易类型实例化对应的交易对象
                    let transaction;
                    switch (txData.type) {
                        case 'USER_REGISTRATION':
                            transaction = new UserRegistrationTransaction(txData);
                            break;
                        // ... 其他交易类型
                        default:
                            this.logger.warn(`Unknown transaction type: ${txData.type}`);
                            return;  // 跳过未知类型的交易
                    }

                    // 验证交易并添加到池中
                    if (transaction && transaction.isValid() && !this.chain.pendingTransactions.has(transaction.hash)) {
                        this.chain.addTransaction(transaction);
                    }
                } catch (error) {
                    this.logger.error('Error processing transaction:', error);
                    // 继续处理下一个交易
                }
            });

            this.logger.info('Transaction pool synchronized');
        } catch (error) {
            this.logger.error('Error handling pool response:', error);
        }
    }

    /**
     * 广播交易
     */
    broadcastTransaction(transaction) {
        this.logger.debug('Broadcasting transaction:', transaction);
        console.log("transaction.toJSON:",transaction.toJSON());
        this.broadcast({
            type: MESSAGE_TYPES.NEW_TRANSACTION,
            data: transaction.toJSON(),
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
        //console.log("peers.length:", this.node.peers);
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
            this.logger.info(`Sending message type: ${message.type}`);
            const messageStr = JSON.stringify(message);
            this.logger.debug(`Message content: ${messageStr}`);
            peer.send(messageStr);
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