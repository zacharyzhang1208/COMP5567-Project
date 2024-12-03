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
 * Handles loading and validation of environment variables
 */
class EnvironmentConfig {
	/**
	 * Initialize the environment configuration
	 * Sets up required environment variables and performs initial validation
	 */
	constructor() {
		this.requiredEnvVars = [
			'P2P_PORT',
			// Add other required environment variables here
		];
		this.init();
	}

	/**
	 * Initialize the configuration
	 * Performs the complete setup process in the correct order
	 */
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
		if (!fs.existsSync(envPath)) {
			throw new EnvConfigError('.env file not found');
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
		const missingEnvVars = this.requiredEnvVars.filter(
			envVar => !process.env[envVar]
		);

		if (missingEnvVars.length > 0) {
			throw new EnvConfigError(`Missing required variables: ${missingEnvVars.join(', ')}`);
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
}

export const envConfig = new EnvironmentConfig(); 