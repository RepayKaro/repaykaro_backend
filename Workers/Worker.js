// worker.js
const amqp = require("amqplib");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const { uploadToS3, deleteFileFromS3 } = require("../Utils/s3-config");

dotenv.config();

const queues = ["s3UploadQueue", "emailQueue", "deleteFileFromS3"];
let connection, channel;

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // smtpout.secureserver.net
  port: Number(process.env.EMAIL_PORT), // 465
  secure: true, // true for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Handles each queue message
 */
async function handleMessage(queue, msg) {
  if (!msg) return;

  let data;
  try {
    data = JSON.parse(msg.content.toString());
  } catch (err) {
    console.error(`❌ [${queue}] JSON parse error:`, err);
    channel.ack(msg); // Avoid getting stuck
    return;
  }

  try {
    switch (queue) {
      case "s3UploadQueue": {
        const { filePath, bucket, key } = data;
        const fileUrl = await uploadToS3(filePath, bucket, key);
        console.log(`✅ [${queue}] File uploaded to S3: ${fileUrl}`);
        break;
      }
      case "emailQueue": {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: data.to,
          subject: data.subject,
          html: data.html,
        });
        console.log(`✅ [${queue}] Email sent to ${data.to}`);
        break;
      }
      case "deleteFileFromS3": {
        const { bucket, key } = data;
        await deleteFileFromS3(bucket, key);
        console.log(`✅ [${queue}] File deleted from S3: ${key}`);
        break;
      }
      default:
        console.warn(`⚠️ [${queue}] No handler implemented`);
    }

    channel.ack(msg);
  } catch (err) {
    console.error(`❌ [${queue}] Error handling message:`, err);
    channel.nack(msg, false, false); // Reject and don't requeue
  }
}

/**
 * Start the worker and listen to queues
 */
async function startWorker() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    connection.on("error", (err) => {
      console.error("💥 RabbitMQ connection error:", err);
    });

    connection.on("close", () => {
      console.warn("🔌 RabbitMQ connection closed. Reconnecting in 5s...");
      setTimeout(startWorker, 5000);
    });

    for (const queue of queues) {
      await channel.assertQueue(queue, { durable: true });
      channel.consume(queue, (msg) => handleMessage(queue, msg), {
        noAck: false,
      });
      console.log(`🎧 Listening on queue: ${queue}`);
    }

    console.log("✅ Worker is running.");
  } catch (err) {
    console.error("❌ Failed to start worker:", err);
    setTimeout(startWorker, 5000);
  }
}

// 🧹 Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Gracefully shutting down...");
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
});

startWorker();
