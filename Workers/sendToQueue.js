// rabbitmq.js
const amqp = require("amqplib");
const dotenv = require("dotenv");

dotenv.config();

let connection = null;
let channel = null;

/**
 * Connect to RabbitMQ and reuse channel
 */
async function connectRabbitMQ() {
  if (channel) return channel;

  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    console.log("✅ Connected to RabbitMQ");

    // Graceful shutdown
    process.on("exit", () => {
      if (connection) connection.close();
      console.log("🛑 RabbitMQ connection closed on process exit");
    });

    return channel;
  } catch (err) {
    console.error("❌ Failed to connect to RabbitMQ:", err);
    throw err;
  }
}

/**
 * Send message to a RabbitMQ queue
 * @param {string} queueName - Name of the queue
 * @param {object} data - Data to send
 */
async function sendToQueue(queueName, data) {
  try {
    const ch = await connectRabbitMQ();
    await ch.assertQueue(queueName, { durable: true });

    const success = ch.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );

    if (success) {
      console.log(`📤 Message sent to queue "${queueName}"`);
    } else {
      console.warn(`⚠️ Message not sent to queue "${queueName}"`);
    }
  } catch (err) {
    console.error("❌ Error in sendToQueue:", err);
  }
}

module.exports = {
  sendToQueue,
};
