require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const app = express();
const CouponModel = require("../Models/Coupon");
const CouponEncryptionModel = require("../Models/CouponEncryption");
const { uploadTimeline } = require("../Utils/timeline-creator");

// Load environment variables
const encryptionKey =
  process.env.ENCRYPTION_KEY || "743b1cf3fb4EEgWG4UJZONDprHa24125";
const encryptionIV = process.env.ENCRYPTION_IV || "ABCDEFGHIJKLMNOP";
const saltKey =
  process.env.SALT_KEY || "Rckd39KVomIlPaXhJTZpoYbJOq6kT9YaqNloWq";

// Rate Limiting (Max 5 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    status: "error",
    message: "Too many requests, slow down!",
    statusCode: 429,
  },
});

app.use(limiter);
app.use(express.json());

// Security Headers
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});
const updateRealtimeCouponByThirdParty = async (req, res) => {
  try {
    const encryptedData = req.query.Data;

    const encryptedCode = new CouponEncryptionModel({
      encrypted_code: encryptedData, // Default phone if not provided
    });
    const savedEncryptedCode = await encryptedCode.save();
    if (savedEncryptedCode) {
      console.log("Encrypted code saved successfully:", savedEncryptedCode);
    }
    if (!encryptedData) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing data", statusCode: 400 });
    }

    // Convert URL-safe Base64 to standard Base64
    let decodedData = encryptedData.replace(/-/g, "+").replace(/_/g, "/");
    console.log("Received encrypted data:", decodedData);

    // Add padding if necessary
    while (decodedData.length % 4 !== 0) {
      decodedData += "=";
    }

    // Decrypt Data
    const decryptedString = decryptAES(
      decodedData,
      encryptionKey,
      encryptionIV
    );
    if (!decryptedString) {
      return res.status(400).json({
        status: "error",
        message: "Decryption failed",
        statusCode: 400,
      });
    }

    // Extract Fields
    const dataParts = decryptedString.split("|");
    if (dataParts.length !== 3) {
      return res.status(400).json({
        status: "error",
        message: "Invalid data format",
        statusCode: 400,
      });
    }

    const [uniqueReferenceNo, couponVoucher, receivedChecksum] = dataParts;

    // Validate Extracted Data
    if (
      !/^[a-zA-Z0-9]+$/.test(uniqueReferenceNo) ||
      !/^[a-zA-Z0-9]+$/.test(couponVoucher)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid data format",
        statusCode: 400,
      });
    }

    // Verify Checksum
    const calculatedChecksum = generateChecksum(
      uniqueReferenceNo,
      couponVoucher,
      saltKey
    );
    if (!secureCompare(calculatedChecksum, receivedChecksum)) {
      return res.status(403).json({
        status: "error",
        message: "Checksum validation failed",
        statusCode: 403,
      });
    }

    const updatedCustomer = await CouponModel.findOneAndUpdate(
      { _id: uniqueReferenceNo }, // Query condition
      { scratched: 1, redeemed: 1 }, // Update data
      { new: true } // Return updated document
    );
    if (!updatedCustomer) {
      console.log(
        "No customer found with the given uniqueReferenceNo:",
        uniqueReferenceNo
      );
    }
    const isCouponExist = await CouponModel.findOne({ _id: uniqueReferenceNo });
    if (!isCouponExist) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon not found" });
    }

    await uploadTimeline(
      isCouponExist.phone,
      isCouponExist.customer_id,
      "Update",
      `Coupon Redeemed`,    
       `Congratulation Your Coupon Redeemed successfully (${isCouponExist.coupon_code})`
    );
    // Return Valid Response
    return res
      .status(200)
      .json({ status: "success", message: "Status Updated", statusCode: 200 });
  } catch (error) {
    console.error("Error in updateRealtimeCouponByThirdParty:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
      statusCode: 500,
    });
  }
};

// AES-256-CBC Decryption Function
function decryptAES(encryptedData, key, iv) {
  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(key, "utf8"),
      Buffer.from(iv, "utf8")
    );
    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    return null;
  }
}

// Generate SHA-512 Checksum
function generateChecksum(uniqueReferenceNo, couponVoucher, saltKey) {
  const checksumString = `${uniqueReferenceNo}|${couponVoucher}|${saltKey}`;
  return crypto.createHash("sha512").update(checksumString).digest("hex");
}

// Secure Comparison Function (Prevents Timing Attacks)
function secureCompare(a, b) {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = { updateRealtimeCouponByThirdParty };
