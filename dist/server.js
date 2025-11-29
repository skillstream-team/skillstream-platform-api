"use strict";
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
const prisma_1 = require("./utils/prisma");
const redis_1 = __importDefault(require("./utils/redis"));
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
// Initialize admin messaging service with io instance
(0, admin_messaging_service_1.setSocketIO)(io);
const PORT = parseInt(env_1.env.PORT, 10);
// Security middleware (must be first)
app.use(security_1.securityHeaders);
// CORS
app.use((0, cors_1.default)(security_1.corsOptions));
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
});
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
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
