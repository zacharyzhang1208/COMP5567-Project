class WebSocketService {
    constructor() {
        this.ws = null;
        this.subscribers = new Set();
    }

    connect() {
        // 连接到WebSocket服务器
        this.ws = new WebSocket('ws://localhost:8080');

        this.ws.onopen = () => {
            console.log('WebSocket Connected');
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.notifySubscribers(message);
        };

        this.ws.onclose = () => {
            console.log('WebSocket Disconnected');
            // 可以在这里添加重连逻辑
            setTimeout(() => this.connect(), 5000);
        };
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    notifySubscribers(message) {
        this.subscribers.forEach(callback => callback(message));
    }

    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}

export default new WebSocketService(); 