import readline from 'readline';
import Logger from './logger.js';

class CLI {
    static async prompt(question) {
        Logger.startUserInput();
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        try {
            const answer = await new Promise((resolve) => {
                rl.question(question, (answer) => {
                    resolve(answer);
                });
            });
            
            return answer;
        } finally {
            rl.close();
            Logger.endUserInput();
        }
    }
}

export default CLI; 