import { Kafka } from "kafkajs";

// Get Kafka configuration from environment variables
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || "";
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "skillstream-backend";
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || "skillstream-group";

// Only initialize Kafka if brokers are provided
let kafka: Kafka | null = null;
let producer: ReturnType<Kafka["producer"]> | null = null;
let consumer: ReturnType<Kafka["consumer"]> | null = null;

if (KAFKA_BROKERS) {
    const brokers = KAFKA_BROKERS.split(",").map(b => b.trim());
    kafka = new Kafka({
        clientId: KAFKA_CLIENT_ID,
        brokers: brokers,
    });
    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
}

export { producer, consumer };

export async function connectKafka() {
    if (!kafka || !producer || !consumer) {
        console.log("⚠️  Kafka not configured (KAFKA_BROKERS not set). Skipping Kafka connection.");
        return;
    }
    
    try {
        await producer.connect();
        await consumer.connect();
        console.log("✅ Kafka connected");
    } catch (error) {
        console.error("❌ Failed to connect to Kafka:", error);
        throw error;
    }
}

export function isKafkaAvailable(): boolean {
    return kafka !== null && producer !== null && consumer !== null;
}

/**
 * Safely send a message to a Kafka topic
 * Returns true if message was sent, false if Kafka is not available
 */
export async function sendKafkaMessage(topic: string, message: any): Promise<boolean> {
    if (!isKafkaAvailable() || !producer) {
        console.warn(`⚠️  Kafka not available. Message to topic "${topic}" was not sent.`);
        return false;
    }

    try {
        await producer.send({
            topic,
            messages: [
                {
                    value: JSON.stringify(message),
                },
            ],
        });
        return true;
    } catch (error) {
        console.error(`❌ Failed to send message to Kafka topic "${topic}":`, error);
        return false;
    }
}