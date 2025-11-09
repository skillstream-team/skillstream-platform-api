// src/notification/service.ts
import { consumer } from "../utils/kafka";
import { io } from "../server"; // we'll define io soon

export async function startNotificationService() {
    await consumer.subscribe({ topic: "notification.send", fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ message }) => {
            if (!message.value) return;
            const notif = JSON.parse(message.value.toString());

            console.log(` Notification received for user ${notif.toUserId}:`, notif.message);

            // Emit to the specific user's socket room
            io.to(`user-${notif.toUserId}`).emit("notification", notif);
        },
    });

    console.log(" Notification service listening on Kafka topic: notification.send");
}