"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startNotificationService = startNotificationService;
// src/notification/service.ts
const kafka_1 = require("../utils/kafka");
const server_1 = require("../server");
async function startNotificationService() {
    if (!(0, kafka_1.isKafkaAvailable)() || !kafka_1.consumer) {
        console.log("⚠️  Kafka not available. Notification service will not start.");
        return;
    }
    try {
        await kafka_1.consumer.subscribe({ topic: "notification.send", fromBeginning: false });
        await kafka_1.consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value)
                    return;
                const notif = JSON.parse(message.value.toString());
                console.log(`📩 Notification received for user ${notif.toUserId}:`, notif.message);
                // Emit to the specific user's socket room
                server_1.io.to(`user-${notif.toUserId}`).emit("notification", notif);
            },
        });
        console.log("✅ Notification service listening on Kafka topic: notification.send");
    }
    catch (error) {
        console.error("❌ Error starting notification service:", error);
        // Don't throw - allow server to continue without notification service
    }
}
