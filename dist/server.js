"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const swagger_1 = require("./swagger");
const kafka_1 = require("./utils/kafka");
const users_1 = require("./modules/users");
const courses_1 = require("./modules/courses");
const messaging_1 = require("./modules/messaging");
const admin_messaging_service_1 = require("./modules/users/services/admin-messaging.service");
const env_1 = require("./utils/env");
const error_handler_1 = require("./middleware/error-handler");
const security_1 = require("./middleware/security");
const logger_1 = require("./middleware/logger");
const request_id_1 = require("./middleware/request-id");
const prisma_1 = require("./utils/prisma");
const redis_1 = __importDefault(require("./utils/redis"));
const sentry_1 = require("./utils/sentry");
const Sentry = __importStar(require("@sentry/node"));
const compression_1 = __importDefault(require("compression"));
const rate_limit_1 = require("./middleware/rate-limit");
const timeout_1 = require("./middleware/timeout");
// Initialize Sentry FIRST (before anything else that might throw)
(0, sentry_1.initSentry)();
// Validate environment variables on startup
try {
    (0, env_1.validateEnv)();
    console.log("✅ Environment variables validated");
}
catch (error) {
    console.error("❌ Environment validation failed:", error.message);
    process.exit(1);
}
const app = (0, express_1.default)();
// Trust first proxy (Render/Cloudflare) so rate limiting and IP-based features work correctly
app.set('trust proxy', 1);
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: security_1.corsOptions,
    transports: ['websocket', 'polling'],
});
exports.io = io;
// Add Redis adapter for Socket.IO if Redis is available (enables horizontal scaling)
if (redis_1.default) {
    try {
        // For Socket.IO v4, we use the Redis adapter
        // Note: socket.io-redis package is for v3, for v4 we need @socket.io/redis-adapter
        // For now, we'll use the built-in Redis adapter pattern
        const { createAdapter } = require("@socket.io/redis-adapter");
        const pubClient = redis_1.default;
        const subClient = redis_1.default.duplicate();
        io.adapter(createAdapter(pubClient, subClient));
        console.log("✅ Socket.IO Redis adapter enabled for horizontal scaling");
    }
    catch (error) {
        console.warn("⚠️  Redis adapter not available. Socket.IO will use in-memory adapter.");
        console.warn("   Install @socket.io/redis-adapter for horizontal scaling support.");
    }
}
// Initialize admin messaging service with io instance
(0, admin_messaging_service_1.setSocketIO)(io);
const PORT = parseInt(env_1.env.PORT, 10);
// Sentry request handlers (must be before other middleware)
// Note: In Sentry v8+, request handling is done via integrations
// The expressIntegration handles this automatically
// Request ID tracking (must be early)
app.use(request_id_1.requestId);
// Compression middleware
app.use((0, compression_1.default)());
// Security middleware
app.use(security_1.securityHeaders);
// CORS
app.use((0, cors_1.default)(security_1.corsOptions));
// General rate limiting (applied to all routes)
app.use(rate_limit_1.generalRateLimiter);
// Request timeout (30 seconds default)
app.use((0, timeout_1.requestTimeout)(30000));
// Request logging
app.use(logger_1.requestLogger);
// Body parsing with size limits
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Register modules
(0, users_1.registerUserModule)(app);
(0, courses_1.registerCoursesModule)(app);
(0, messaging_1.registerMessagingModule)(app, io);
// Setup Swagger docs
(0, swagger_1.setupSwagger)(app);
// Health check endpoint
app.get("/health", async (req, res) => {
    const dbConnected = await (0, prisma_1.testDatabaseConnection)();
    const redisConnected = redis_1.default ? await redis_1.default.ping().then(() => true).catch(() => false) : false;
    const health = {
        status: dbConnected ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        services: {
            database: dbConnected,
            redis: redisConnected,
            kafka: (0, kafka_1.isKafkaAvailable)(),
        },
        uptime: process.uptime(),
    };
    const statusCode = dbConnected ? 200 : 503;
    res.status(statusCode).json(health);
});
// Root endpoint
app.get("/", (req, res) => {
    res.json({
        message: "SkillStream Platform API",
        version: "1.0.0",
        status: "running",
        docs: "/api-docs",
        health: "/health",
    });
});
// Example route
app.get("/hello", (req, res) => {
    res.send("Hello SkillStream!");
});
//
// -------------- SOCKET.IO SETUP --------------
//
io.on("connection", (socket) => {
    console.log(`🔌 New socket connected: ${socket.id}`);
    socket.on("register", (userId) => {
        socket.join(`user-${userId}`);
        console.log(`👤 User ${userId} joined room user-${userId}`);
    });
    socket.on("disconnect", () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
    socket.on("error", (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
    });
});
//
// -------------- KAFKA CONSUMER --------------
//
async function startKafka() {
    if (!(0, kafka_1.isKafkaAvailable)() || !kafka_1.consumer) {
        console.log("⚠️  Kafka not available. Skipping Kafka consumer setup.");
        return;
    }
    try {
        await kafka_1.consumer.connect();
        await kafka_1.consumer.subscribe({ topic: "notification.send", fromBeginning: false });
        await kafka_1.consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value)
                    return;
                try {
                    const notif = JSON.parse(message.value.toString());
                    console.log(`📩 New notification for user ${notif.toUserId}:`, notif.message);
                    io.to(`user-${notif.toUserId}`).emit("notification", notif);
                }
                catch (error) {
                    console.error("❌ Error processing Kafka message:", error);
                }
            },
        });
        console.log("✅ Kafka connected & listening for notifications...");
    }
    catch (err) {
        console.error("❌ Error setting up Kafka consumer:", err);
        // Don't throw - allow server to start without Kafka
    }
}
//
// -------------- GRACEFUL SHUTDOWN --------------
//
let isShuttingDown = false;
async function gracefulShutdown(signal) {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    // Stop accepting new connections
    server.close(() => {
        console.log("✅ HTTP server closed");
    });
    // Close Socket.IO connections
    io.close(() => {
        console.log("✅ Socket.IO server closed");
    });
    // Disconnect Kafka
    if ((0, kafka_1.isKafkaAvailable)() && kafka_1.producer && kafka_1.consumer) {
        try {
            await kafka_1.producer.disconnect();
            await kafka_1.consumer.disconnect();
            console.log("✅ Kafka disconnected");
        }
        catch (error) {
            console.error("❌ Error disconnecting Kafka:", error);
        }
    }
    // Disconnect Redis
    if (redis_1.default) {
        try {
            await redis_1.default.quit();
            console.log("✅ Redis disconnected");
        }
        catch (error) {
            console.error("❌ Error disconnecting Redis:", error);
        }
    }
    // Disconnect Prisma
    try {
        await prisma_1.prisma.$disconnect();
        console.log("✅ Database disconnected");
    }
    catch (error) {
        console.error("❌ Error disconnecting database:", error);
    }
    console.log("👋 Graceful shutdown complete");
    process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        Sentry.captureException(reason, {
            tags: {
                type: 'unhandledRejection',
            },
        });
    }
});
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Send to Sentry in production before shutdown
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
            tags: {
                type: 'uncaughtException',
            },
        });
        // Flush Sentry before shutdown
        Sentry.flush(2000).then(() => {
            gracefulShutdown('uncaughtException');
        });
    }
    else {
        gracefulShutdown('uncaughtException');
    }
});
// Sentry error handler (before global error handler)
// Note: Error handling is done via our custom errorHandler middleware
// Global error handler (must be last)
app.use(error_handler_1.errorHandler);
//
// -------------- START SERVER --------------
//
(async () => {
    try {
        // Test database connection
        console.log("🔌 Testing database connection...");
        const dbConnected = await (0, prisma_1.testDatabaseConnection)();
        if (!dbConnected) {
            console.error("❌ Database connection failed. Exiting...");
            process.exit(1);
        }
        console.log("✅ Database connected");
        // Start Kafka consumer (non-blocking if not available)
        await startKafka();
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${env_1.env.NODE_ENV}`);
            console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
            console.log(`💚 Health check: http://localhost:${PORT}/health`);
        });
    }
    catch (err) {
        console.error("❌ Error starting server:", err);
        process.exit(1);
    }
})();
