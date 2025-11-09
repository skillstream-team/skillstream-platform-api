import express from "express";
import http from "http";
import { Server } from "socket.io";
import { setupSwagger } from "./swagger";
import { Kafka } from "kafkajs";
import { registerUserModule } from "./modules/users";
import { registerCoursesModule } from "./modules/courses";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true 
    },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Register modules
registerUserModule(app);
registerCoursesModule(app);

// Setup Swagger docs
setupSwagger(app);

// Example route
app.get("/hello", (req, res) => {
    res.send("Hello SkillStream!");
});

//
// -------------- KAFKA SETUP --------------
//
const kafka = new Kafka({
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
            if (!message.value) return;
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
    } catch (err) {
        console.error(" Error starting server:", err);
    }
})();

export { io };