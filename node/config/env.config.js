import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

/**
 * Custom error class for environment configuration errors
 */
class EnvConfigError extends Error {
	constructor(message) {
		super(message);
		this.name = 'EnvConfigError';
	}
}

/**
 * Environment configuration manager class
 */
class EnvironmentConfig {
	constructor() {
		this.requiredEnvVars = [
			'P2P_PORT_START',
			'P2P_PORT_END'
		];
		this.init();
	}

	init() {
		try {
			this.checkEnvFile();
			this.loadEnvFile();
			this.validateEnv();
		} catch (error) {
			if (error instanceof EnvConfigError) {
				console.error('\x1b[31m%s\x1b[0m', `Configuration Error: ${error.message}`);
			} else {
				console.error('\x1b[31m%s\x1b[0m', 'An unexpected error occurred:', error);
			}
			process.exit(1);
		}
	}

	/**
	 * Check if .env file exists
	 * Provides helpful instructions if the file is missing
	 * @throws {EnvConfigError} If .env file is not found
	 */
	checkEnvFile() {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);
		const rootDir = join(__dirname, '../');
		const envPath = join(rootDir, '.env');
		const exampleEnvPath = join(rootDir, '.env.example');

		if (!fs.existsSync(envPath)) {
			console.log('\x1b[33m%s\x1b[0m', '.env file not found, attempting to create from .env.example');
			
			// 检查 .env.example 是否存在
			if (!fs.existsSync(exampleEnvPath)) {
				throw new EnvConfigError('.env.example file not found');
			}

			try {
				// 复制 .env.example 到 .env
				fs.copyFileSync(exampleEnvPath, envPath);
				console.log('\x1b[32m%s\x1b[0m', '✓ Created .env file from .env.example');
			} catch (error) {
				throw new EnvConfigError(`Failed to create .env file: ${error.message}`);
			}
		}
	}

	/**
	 * Load environment variables from .env file
	 * Uses dotenv to parse and load the environment variables
	 * @throws {EnvConfigError} If unable to load or parse .env file
	 */
	loadEnvFile() {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);
		const rootDir = join(__dirname, '../');
		const envPath = join(rootDir, '.env');

		const result = dotenv.config({ path: envPath });
		
		if (result.error) {
			throw new EnvConfigError('Failed to parse .env file');
		}

		console.log('\x1b[32m%s\x1b[0m', '✓ Environment variables loaded successfully');
	}

	/**
	 * Validate that all required environment variables are present
	 * Checks if any required variables are missing from the environment
	 * @throws {EnvConfigError} If any required environment variables are missing
	 */
	validateEnv() {
		// 检查必需的环境变量
		const missingEnvVars = this.requiredEnvVars.filter(
			envVar => !process.env[envVar]
		);

		if (missingEnvVars.length > 0) {
			throw new EnvConfigError(`Missing required variables: ${missingEnvVars.join(', ')}`);
		}

		// 验证端口范围的有效性
		const startPort = parseInt(process.env.P2P_PORT_START);
		const endPort = parseInt(process.env.P2P_PORT_END);

		if (isNaN(startPort) || isNaN(endPort)) {
			throw new EnvConfigError('Port range values must be numbers');
		}

		if (startPort >= endPort) {
			throw new EnvConfigError('P2P_PORT_START must be less than P2P_PORT_END');
		}

		if (startPort < 1024 || endPort > 65535) {
			throw new EnvConfigError('Port range must be between 1024 and 65535');
		}
	}

	/**
	 * Get the value of an environment variable
	 * @param {string} key - The name of the environment variable to retrieve
	 * @returns {string|undefined} The value of the environment variable
	 */
	get(key) {
		return process.env[key];
	}

	/**
	 * 获取网络配置
	 * @returns {Object} 网络配置对象
	 */
	getNetworkConfig() {
		return {
			portRange: {
				start: parseInt(process.env.P2P_PORT_START),
				end: parseInt(process.env.P2P_PORT_END)
			}
		};
	}
}

export const envConfig = new EnvironmentConfig(); 