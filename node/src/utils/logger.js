class Logger {
    static COLORS = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
    };

    static LEVELS = {
        DEBUG: { priority: 0, color: 'dim' },
        INFO: { priority: 1, color: 'green' },
        WARN: { priority: 2, color: 'yellow' },
        ERROR: { priority: 3, color: 'red' }
    };

    static isUserInputting = false;

    constructor(module) {
        this.module = module;
        this.debugMode = process.env.DEBUG_MODE === 'true';
    }

    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        const color = Logger.COLORS[Logger.LEVELS[level].color];
        const reset = Logger.COLORS.reset;
        return `${color}[${timestamp}] [${level}] [${this.module}] ${message}${reset}`;
    }

    static startUserInput() {
        Logger.isUserInputting = true;
    }

    static endUserInput() {
        Logger.isUserInputting = false;
    }

    debug(...args) {
        if (this.debugMode && !Logger.isUserInputting) {
            console.log(this.formatMessage('DEBUG', args.join(' ')));
        }
    }

    info(...args) {
        if (!Logger.isUserInputting) {
            console.log(this.formatMessage('INFO', args.join(' ')));
        }
    }

    warn(...args) {
        if (!Logger.isUserInputting) {
            console.warn(this.formatMessage('WARN', args.join(' ')));
        }
    }

    error(...args) {
        if (!Logger.isUserInputting) {
            console.error(this.formatMessage('ERROR', args.join(' ')));
        }
    }

    // 用于记录对象
    logObject(level, obj) {
        if (Logger.isUserInputting) return;
        if (level === 'DEBUG' && !this.debugMode) return;
        
        const formatted = this.formatMessage(level, '');
        console.log(formatted);
        console.dir(obj, { depth: null, colors: true });
    }
}

export default Logger; 