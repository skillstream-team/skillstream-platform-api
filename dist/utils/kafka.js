"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consumer = exports.producer = void 0;
exports.connectKafka = connectKafka;
const kafkajs_1 = require("kafkajs");
const kafka = new kafkajs_1.Kafka({
    clientId: "skillstream-backend",
    brokers: ["localhost:29092"]
});
exports.producer = kafka.producer();
exports.consumer = kafka.consumer({ groupId: "skillstream-group" });
async function connectKafka() {
    await exports.producer.connect();
    await exports.consumer.connect();
    console.log("Kafka connected");
}
