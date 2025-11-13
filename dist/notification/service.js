"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startNotificationService = startNotificationService;
// src/notification/service.ts
const kafka_1 = require("../utils/kafka");
const server_1 = require("../server"); // we'll define io soon
async function startNotificationService() {
    await kafka_1.consumer.subscribe({ topic: "notification.send", fromBeginning: false });
    await kafka_1.consumer.run({
        eachMessage: async ({ message }) => {
            if (!message.value)
                return;
            const notif = JSON.parse(message.value.toString());
            console.log(` Notification received for user ${notif.toUserId}:`, notif.message);
            // Emit to the specific user's socket room
            server_1.io.to(`user-${notif.toUserId}`).emit("notification", notif);
        },
    });
    console.log(" Notification service listening on Kafka topic: notification.send");
}
