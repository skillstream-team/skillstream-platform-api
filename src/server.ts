import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { setupSwagger } from "./swagger";
import { producer, consumer, isKafkaAvailable } from "./utils/kafka";
import { registerUserModule } from "./modules/users";
import { registerCoursesModule } from "./modules/courses";
import { validateEnv, env } from "./utils/env";
import { errorHandler } from "./middleware/error-handler";
import { securityHeaders, corsOptions } from "./middleware/security";
import { requestLogger } from "./middleware/logger";
import { testDatabaseConnection, prisma } from "./utils/prisma";
import redisClient from "./utils/redis";

// Validate environment variables on startup
try {
  validateEnv();
  console.log("✅ Environment variables validated");
} catch (error) {
  console.error("❌ Environment validation failed:", (error as Error).message);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
});

const PORT = parseInt(env.PORT, 10);

// Security middleware (must be first)
app.use(securityHeaders);

// CORS
app.use(cors(corsOptions));

// Request logging
app.use(requestLogger);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Register modules
registerUserModule(app);
registerCoursesModule(app);

// Setup Swagger docs
setupSwagger(app);

// Health check endpoint
app.get("/health", async (req, res) => {
    const dbConnected = await testDatabaseConnection();
    const redisConnected = redisClient ? await redisClient.ping().then(() => true).catch(() => false) : false;
    
    const health = {
        status: dbConnected ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        services: {
            database: dbConnected,
            redis: redisConnected,
            kafka: isKafkaAvailable(),
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
    if (!isKafkaAvailable() || !consumer) {
        console.log("⚠️  Kafka not available. Skipping Kafka consumer setup.");
        return;
    }

    try {
        await consumer.connect();
        await consumer.subscribe({ topic: "notification.send", fromBeginning: false });

        await consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value) return;
                try {
                    const notif = JSON.parse(message.value.toString());
                    console.log(`📩 New notification for user ${notif.toUserId}:`, notif.message);
                    io.to(`user-${notif.toUserId}`).emit("notification", notif);
                } catch (error) {
                    console.error("❌ Error processing Kafka message:", error);
                }
            },
        });

        console.log("✅ Kafka connected & listening for notifications...");
    } catch (err) {
        console.error("❌ Error setting up Kafka consumer:", err);
        // Don't throw - allow server to start without Kafka
    }
}

//
// -------------- GRACEFUL SHUTDOWN --------------
//
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
    if (isShuttingDown) return;
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
    if (isKafkaAvailable() && producer && consumer) {
        try {
            await producer.disconnect();
            await consumer.disconnect();
            console.log("✅ Kafka disconnected");
        } catch (error) {
            console.error("❌ Error disconnecting Kafka:", error);
        }
    }

    // Disconnect Redis
    if (redisClient) {
        try {
            await redisClient.quit();
            console.log("✅ Redis disconnected");
        } catch (error) {
            console.error("❌ Error disconnecting Redis:", error);
        }
    }

    // Disconnect Prisma
    try {
        await prisma.$disconnect();
        console.log("✅ Database disconnected");
    } catch (error) {
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
app.use(errorHandler);

//
// -------------- START SERVER --------------
//
(async () => {
    try {
        // Test database connection
        console.log("🔌 Testing database connection...");
        const dbConnected = await testDatabaseConnection();
        if (!dbConnected) {
            console.error("❌ Database connection failed. Exiting...");
            process.exit(1);
        }
        console.log("✅ Database connected");

        // Start Kafka consumer (non-blocking if not available)
        await startKafka();

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${env.NODE_ENV}`);
            console.log(`📚 Swagger docs: http://localhost:${PORT}/api-docs`);
            console.log(`💚 Health check: http://localhost:${PORT}/health`);
        });
    } catch (err) {
        console.error("❌ Error starting server:", err);
        process.exit(1);
    }
})();

export { io };