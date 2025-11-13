"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const swagger_1 = require("./swagger");
const kafkajs_1 = require("kafkajs");
const users_1 = require("./modules/users");
const courses_1 = require("./modules/courses");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true
    },
});
exports.io = io;
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express_1.default.json());
// Register modules
(0, users_1.registerUserModule)(app);
(0, courses_1.registerCoursesModule)(app);
// Setup Swagger docs
(0, swagger_1.setupSwagger)(app);
// Example route
app.get("/hello", (req, res) => {
    res.send("Hello SkillStream!");
});
//
// -------------- KAFKA SETUP --------------
//
const kafka = new kafkajs_1.Kafka({
    clientId: "skillstream-backend",
    brokers: ["localhost:29092"], // make sure this matches your docker-compose
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "notification-group" });
//
// -------------- SOCKET.IO SETUP --------------
//
io.on("connection", (socket) => {
    console.log(" New socket connected:", socket.id);
    socket.on("register", (userId) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined room user-${userId}`);
    });
    socket.on("disconnect", () => {
        console.log(" Socket disconnected:", socket.id);
    });
});
//
// -------------- KAFKA CONSUMER --------------
//
async function startKafka() {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: "notification.send", fromBeginning: false });
    await consumer.run({
        eachMessage: async ({ message }) => {
            if (!message.value)
                return;
            const notif = JSON.parse(message.value.toString());
            console.log(`📩 New notification for user ${notif.toUserId}:`, notif.message);
            // Emit notification via Socket.io
            io.to(`user-${notif.toUserId}`).emit("notification", notif);
        },
    });
    console.log("✅ Kafka connected & listening for notifications...");
}
//
// -------------- START SERVER --------------
//
(async () => {
    try {
        await startKafka();
        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
        });
    }
    catch (err) {
        console.error(" Error starting server:", err);
    }
})();
