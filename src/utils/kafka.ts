import { Kafka } from "kafkajs";

const kafka = new Kafka ({
    clientId: "skillstream-backend",
    brokers: ["localhost:29092"]
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: "skillstream-group" });

export async function connectKafka() {
    await producer.connect();
    await consumer.connect();
    console.log("Kafka connected");
}