import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { setupSwagger } from "./swagger";
import { producer, consumer, isKafkaAvailable } from "./utils/kafka";
import { registerUserModule } from "./modules/users";
import { registerCoursesModule } from "./modules/courses";
import { registerMessagingModule } from "./modules/messaging";
import { registerSubscriptionRoutes } from "./modules/subscriptions";
import { registerWorkshopRoutes } from "./modules/workshops";
import { registerAnalyticsRoutes } from "./modules/analytics";
import { registerEarningsRoutes } from "./modules/earnings";
import { setSocketIO } from "./modules/users/services/admin-messaging.service";
import { validateEnv, env } from "./utils/env";
import { errorHandler } from "./middleware/error-handler";
import { securityHeaders, corsOptions } from "./middleware/security";
import { requestLogger } from "./middleware/logger";
import { requestId } from "./middleware/request-id";
import { noCache } from "./middleware/no-cache";
import { testDatabaseConnection, prisma } from "./utils/prisma";
import redisClient from "./utils/redis";
import { initSentry } from "./utils/sentry";
import * as Sentry from "@sentry/node";
import compression from "compression";
import { generalRateLimiter } from "./middleware/rate-limit";
import { requestTimeout } from "./middleware/timeout";
import { ScheduledTasksService } from "./services/scheduled-tasks.service";
import { initializeFirebase } from "./utils/firebase";

// Initialize Sentry FIRST (before anything else that might throw)
initSentry();

// Initialize Firebase
try {
  initializeFirebase();
  console.log("✅ Firebase initialized");
} catch (error) {
  console.warn("⚠️  Firebase initialization failed (messaging may not work):", error);
}

// Validate environment variables on startup
try {
  validateEnv();
  console.log("✅ Environment variables validated");
} catch (error) {
  console.error("❌ Environment validation failed:", (error as Error).message);
  process.exit(1);
}

const app = express();
// Trust first proxy (Render/Cloudflare) so rate limiting and IP-based features work correctly
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
});

// Add Redis adapter for Socket.IO if Redis is available (enables horizontal scaling)
if (redisClient) {
    try {
        // For Socket.IO v4, we use the Redis adapter
        // Note: socket.io-redis package is for v3, for v4 we need @socket.io/redis-adapter
        // For now, we'll use the built-in Redis adapter pattern
        const { createAdapter } = require("@socket.io/redis-adapter");
        const pubClient = redisClient;
        const subClient = redisClient.duplicate();
        io.adapter(createAdapter(pubClient, subClient));
        console.log("✅ Socket.IO Redis adapter enabled for horizontal scaling");
    } catch (error) {
        console.warn("⚠️  Redis adapter not available. Socket.IO will use in-memory adapter.");
        console.warn("   Install @socket.io/redis-adapter for horizontal scaling support.");
    }
}

// Initialize admin messaging service with io instance
setSocketIO(io);

const PORT = parseInt(env.PORT, 10);

// Sentry request handlers (must be before other middleware)
// Note: In Sentry v8+, request handling is done via integrations
// The expressIntegration handles this automatically

// Request ID tracking (must be early)
app.use(requestId);

// Compression middleware
app.use(compression());

// Security middleware
app.use(securityHeaders);

// No-cache middleware - prevent all caching
app.use(noCache);

// CORS
app.use(cors(corsOptions));

// General rate limiting (applied to all routes)
app.use(generalRateLimiter);

// Request timeout (30 seconds default)
app.use(requestTimeout(30000));

// Request logging
app.use(requestLogger);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Register modules
registerUserModule(app);
registerCoursesModule(app);
registerMessagingModule(app, io);
registerSubscriptionRoutes(app);
registerWorkshopRoutes(app);
registerAnalyticsRoutes(app);
registerEarningsRoutes(app);

// Register admin job routes (for manual task execution)
import adminJobsRoutes from './modules/admin/routes/jobs.routes';
app.use('/api/admin', adminJobsRoutes);

// Setup Swagger docs
setupSwagger(app);

// Enhanced health check endpoint
app.get("/health", async (req, res) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Check database
    let dbStatus = 'unknown';
    let dbLatency = 0;
    try {
        const dbStart = Date.now();
        const dbConnected = await testDatabaseConnection();
        dbLatency = Date.now() - dbStart;
        dbStatus = dbConnected ? 'healthy' : 'unhealthy';
    } catch (error) {
        dbStatus = 'unhealthy';
    }
    
    // Check Redis
    let redisStatus = 'unknown';
    let redisLatency = 0;
    if (redisClient) {
        try {
            const redisStart = Date.now();
            await redisClient.ping();
            redisLatency = Date.now() - redisStart;
            redisStatus = 'healthy';
        } catch (error) {
            redisStatus = 'unhealthy';
        }
    } else {
        redisStatus = 'not_configured';
    }
    
    // Check Kafka
    const kafkaStatus = isKafkaAvailable() ? 'available' : 'unavailable';
    
    // Memory usage
    const memoryUsage = process.memoryUsage();
    const memoryMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
    };
    
    // CPU usage (approximate)
    const cpuUsage = process.cpuUsage();
    
    // Overall status
    const overallStatus = dbStatus === 'healthy' ? 'ok' : 'degraded';
    const totalLatency = Date.now() - startTime;
    
    const health = {
        status: overallStatus,
        timestamp,
        uptime: Math.round(process.uptime()),
        responseTime: totalLatency,
        services: {
            database: {
                status: dbStatus,
                latency: `${dbLatency}ms`,
            },
            redis: {
                status: redisStatus,
                latency: redisLatency > 0 ? `${redisLatency}ms` : 'N/A',
            },
            kafka: {
                status: kafkaStatus,
            },
        },
        system: {
            memory: memoryMB,
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system,
            },
            nodeVersion: process.version,
            platform: process.platform,
        },
    };

    const statusCode = overallStatus === 'ok' ? 200 : 503;
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
            eachMessage: async ({ message }: { message: { value: Buffer | null; key?: Buffer | null } }) => {
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
    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        Sentry.captureException(reason as Error, {
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
    } else {
        gracefulShutdown('uncaughtException');
    }
});

// Sentry error handler (before global error handler)
// Note: Error handling is done via our custom errorHandler middleware

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

        // Start scheduled tasks
        const scheduledTasks = new ScheduledTasksService();
        scheduledTasks.start();

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