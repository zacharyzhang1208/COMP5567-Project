import WebSocket from 'ws';
import { MESSAGE_TYPES } from './message.handler.js';

class NetworkManager {
    constructor(node) {
        this.node = node;
    }

    async connectToNetwork() {
        const networkConfig = this.node.networkConfig;
        const { start, end } = networkConfig.portRange;
        
        console.log(`[P2P] Scanning for peers in port range ${start}-${end}`);
        const connectionPromises = [];
        
        for (let p = start; p <= end; p++) {
            if (p === this.node.port) continue;
            connectionPromises.push(this.connectToPort(p));
        }

        await Promise.all(connectionPromises);
        console.log('[P2P] Network scan completed');
    }

    async connectToPort(port) {
        return new Promise((resolve) => {
            try {
                const ws = new WebSocket(`ws://localhost:${port}`);
                
                const timeout = setTimeout(() => {
                    ws.close();
                    resolve();
                }, 1000);

                ws.on('open', () => {
                    clearTimeout(timeout);
                    console.log(`[P2P] Connected to peer on port ${port}`);
                    this.node.peers.add(ws);
                    this.node.knownPeers.add(`ws://localhost:${port}`);
                    
                    this.node.messageHandler.sendMessage(ws, {
                        type: MESSAGE_TYPES.HANDSHAKE,
                        data: { port: this.node.port }
                    });
                });

                ws.on('message', (message) => {
                    const data = JSON.parse(message);
                    this.node.messageHandler.handleMessage(data, ws);
                    
                    if (data.type === MESSAGE_TYPES.HANDSHAKE_RESPONSE) {
                        resolve();
                    }
                });

                ws.on('error', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                ws.on('close', () => {
                    clearTimeout(timeout);
                    this.node.peers.delete(ws);
                    resolve();
                });
            } catch (err) {
                resolve();
            }
        });
    }

    async connectToPeer(address) {
        if (address === `ws://localhost:${this.node.port}`) {
            return; // 不连接自己
        }
        
        try {
            console.log(`[P2P] Attempting to connect to discovered peer at ${address}`);
            const ws = new WebSocket(address);
            
            const timeout = setTimeout(() => {
                ws.close();
                console.log(`[P2P] Connection timeout for ${address}`);
            }, 1000);

            ws.on('open', () => {
                clearTimeout(timeout);
                console.log(`[P2P] Successfully connected to discovered peer at ${address}`);
                this.node.peers.add(ws);
                this.node.knownPeers.add(address);
                
                this.node.messageHandler.sendMessage(ws, {
                    type: MESSAGE_TYPES.HANDSHAKE,
                    data: { port: this.node.port }
                });
            });

            ws.on('error', () => {
                clearTimeout(timeout);
                console.log(`[P2P] Failed to connect to discovered peer at ${address}`);
            });
        } catch (err) {
            console.error(`[P2P] Error connecting to discovered peer at ${address}:`, err.message);
        }
    }
}

export default NetworkManager; 