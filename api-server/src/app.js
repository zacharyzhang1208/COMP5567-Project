import express from 'express';
import cors from 'cors';
import { envConfig } from '../config/env.config.js';

/**
 * Express application instance
 * @type {express.Application}
 */
const app = express();

/**
 * Middleware Configuration
 * - CORS for cross-origin requests
 * - JSON parser for request bodies
 */
app.use(cors());
app.use(express.json());

/**
 * Route Configuration
 */

/**
 * Root endpoint
 * @route GET /
 * @returns {object} Welcome message
 */
app.get('/', (req, res) => {
	res.json({ message: 'Welcome to the API' });
});

/**
 * Health check endpoint
 * @route GET /health
 * @returns {object} Service status and timestamp
 */
app.get('/health', (req, res) => {
	res.json({ status: 'ok', timestamp: new Date() });
});

/**
 * Error handling middleware
 * Catches all unhandled errors and sends appropriate response
 * @param {Error} err - The error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ 
		error: 'Something broke!',
		message: err.message 
	});
});

/**
 * Server Initialization
 * Start the Express server on the configured port
 */
const port = envConfig.get('PORT');
app.listen(port, () => {
	console.log(`✓ Server is running on port ${port}`);
});

export default app;
