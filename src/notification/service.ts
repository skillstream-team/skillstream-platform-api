// src/notification/service.ts
import { consumer, isKafkaAvailable } from "../utils/kafka";
import { io } from "../server";

export async function startNotificationService() {
    if (!isKafkaAvailable() || !consumer) {
        console.log("⚠️  Kafka not available. Notification service will not start.");
        return;
    }

    try {
        await consumer.subscribe({ topic: "notification.send", fromBeginning: false });

        await consumer.run({
            eachMessage: async ({ message }: { message: { value: Buffer | null; key?: Buffer | null } }) => {
                if (!message.value) return;
                const notif = JSON.parse(message.value.toString());

                console.log(`📩 Notification received for user ${notif.toUserId}:`, notif.message);

                // Emit to the specific user's socket room
                io.to(`user-${notif.toUserId}`).emit("notification", notif);
            },
        });

        console.log("✅ Notification service listening on Kafka topic: notification.send");
    } catch (error) {
        console.error("❌ Error starting notification service:", error);
        // Don't throw - allow server to continue without notification service
    }
}