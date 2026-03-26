const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const connectDB = require('./config/db');
const { startTransactionCleanupJob } = require('./jobs/transactionCleanupJob');
const { initSocketServer } = require('./services/socketService');

// Load env vars
dotenv.config();

const app = express();

// ─── Security Middleware ─────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// ─── Rate Limiting ───────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// ─── Body Parser & Cookies ──────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── Logging ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ─── API Documentation ──────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'EstateManager API is running',
        timestamp: new Date().toISOString()
    });
});

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/properties', require('./routes/propertyRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: `Cannot find ${req.originalUrl} on this server`
    });
});

// ─── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('ERROR :', err.stack);

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            status: 'error',
            message: `Validation Error: ${messages.join('. ')}`
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            status: 'error',
            message: `Duplicate field value: ${field}. Please use another value.`
        });
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        return res.status(400).json({
            status: 'error',
            message: `Invalid ${err.path}: ${err.value}`
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid token. Please log in again.'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            message: 'Your token has expired. Please log in again.'
        });
    }

    // Default error
    res.status(err.statusCode || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});

// ─── Start Server ────────────────────────────────────────────
const startServer = async () => {
    try {
        await connectDB();
        startTransactionCleanupJob();
        const port = process.env.PORT || 5000;

        const httpServer = http.createServer(app);
        initSocketServer(httpServer);

        httpServer.listen(port, () => {
            console.log(`EstateManager API running on port ${port}`);
            console.log(`API Docs: http://localhost:${port}/api-docs`);
        });
    } catch (err) {
        console.error(err.message || err);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = app;
