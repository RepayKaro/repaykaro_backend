const CouponModel = require("../Models/Coupon");
const CustomerModel = require("../Models/Customer");
const { sendSms } = require("./SendSmsController");
const { uploadTimeline } = require("../Utils/timeline-creator");
const CustomerTimeline = require("../Models/CustomerTimeline");
const crypto = require("crypto");
const axios = require("axios");

module.exports.createOnlyCoupon = async (req, res, next) => {
  try {
    const { amount, validity, phone } = req.body;
    const newCoupon = new CouponModel({
      phone: "0000000000", // Default phone if not provided
      coupon_code: "FREE50", // Default coupon code
      amount: amount,
      validity: validity,
    });
    const savedCoupon = await newCoupon.save();
    const response = await generateDynamicURL(
      savedCoupon._id,
      parseFloat(savedCoupon.amount),
      savedCoupon.validity
    );
    if (response.statuscode == 0) {
      const reference_no = savedCoupon._id;
      const coupon = response.VoucherNo;
      const updatedCoupon = await CouponModel.findOneAndUpdate(
        { _id: reference_no }, // Query condition
        { coupon_code: coupon }, // Update data
        { new: true } // Return updated document
      );
      if (!updatedCoupon) {
        return res
          .status(404)
          .json({ message: "Failed to create coupon", success: false });
      }

      return res.status(200).json({
        message: "Coupon Created And Updated successfully",
        success: true,
        coupon: updatedCoupon,
      });
    } else {
      return res
        .status(500)
        .json({ success: false, message: "failed to generate dynamic url" });
    }
  } catch (err) {
    console.error("Error creating coupon:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
module.exports.createCouponAndUpdatePayments = async (req, res, next) => {
  try {
    const { payment_type, customer_id } = req.body;

    let validity = process.env.DEFAULT_VALIDITY;
    const isCustomerExist = await CustomerModel.findOne({ _id: customer_id });
    if (!isCustomerExist) {
      return res
        .status(400)
        .json({ success: false, message: "Customer not found" });
    }
    if (payment_type == 1) {
      validity = process.env.PAYMENT_TYPE_1_VALIDITY;
    } else if (payment_type == 2) {
      validity = process.env.PAYMENT_TYPE_2_VALIDITY;
    } else if (payment_type == 3) {
      validity = process.env.PAYMENT_TYPE_3_VALIDITY;
    }
    const updatedCustomer = await CustomerModel.findOneAndUpdate(
      { _id: customer_id }, // Query condition
      { isPaid: true, payment_type: payment_type }, // Update data
      { new: true } // Return updated document
    );
    if (updatedCustomer) {
      if (payment_type == 1) {
        amount = updatedCustomer.foreclosure_reward;
      } else if (payment_type == 2) {
        amount = updatedCustomer.settlement_reward;
      } else if (payment_type == 3) {
        amount = updatedCustomer.minimum_part_payment_reward;
      }
      const newCoupon = new CouponModel({
        phone: updatedCustomer.phone, // Default phone if not provided
        coupon_code: "FREE50", // Default coupon code
        amount: amount,
        validity: validity,
      });
      const savedCoupon = await newCoupon.save();
      if (savedCoupon) {
        const response = await generateDynamicURL(
          savedCoupon._id,
          savedCoupon.amount,
          validity
        );
        if (response.statuscode == 0) {
          const reference_no = savedCoupon._id;
          const coupon = response.VoucherNo;
          const updatedCoupon = await CouponModel.findOneAndUpdate(
            { _id: reference_no }, // Query condition
            { coupon_code: coupon }, // Update data
            { new: true } // Return updated document
          );
          if (!updatedCoupon) {
            return res
              .status(404)
              .json({ message: "Failed to create coupon", success: false });
          }
          //  sending coupon link
          const Apidata = {
            variables_values: `${updatedCustomer.customer}|${updatedCoupon.coupon_code}|`,
            numbers: updatedCustomer.phone,
          };

          const sendLink = await sendSms("send-coupon-link", Apidata);
          if (!sendLink) {
            return res
              .status(400)
              .json({ message: "Failed to send sms", success: false });
          }
          await uploadTimeline(
            customer_id,
            "Update",
            "Payment Verification Approved",
            "Congratulation Payment get approved and coupon created successfully"
          );
          return res.status(200).json({
            message: "Coupon Created And Updated successfully",
            success: true,
            coupon: updatedCoupon,
          });
        } else {
          return res.status(400).json({
            message: "Failed to create coupon from third party",
            success: false,
          });
        }
      } else {
        return res.status(500).json({
          message: "Failed to create coupon server error",
          success: false,
        });
      }
    } else {
      return res
        .status(500)
        .json({ message: "Failed to update customer payment", success: false });
    }
  } catch (err) {
    console.error("Error creating coupon:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
module.exports.scratchCoupon = async (req, res, next) => {
  try {
    const { coupon_id } = req.body;

    const isCouponExist = await CouponModel.findOne({ _id: coupon_id });
    if (!isCouponExist) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon not found" });
    }
    const updatedCoupon = await CouponModel.findOneAndUpdate(
      { _id: coupon_id }, // Query condition
      { scratched: 1 }, // Update data
      { new: true } // Return updated document
    );
    if (!updatedCoupon) {
      return res
        .status(400)
        .json({ success: false, message: "Failed to update scratch" });
    }
    await uploadTimeline(
      req.user._id.toString(),
      "Scratch",
      "Coupon Scrateched",
      "Coupon Scrateched Successfully."
    );

    // Further logic here (e.g., marking the coupon as scratched)
    return res
      .status(200)
      .json({ success: true, message: "Coupon scratched successfully" });
  } catch (error) {
    console.error("Error in scratchCoupon:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
module.exports.getAllCoupon = async (req, res, next) => {
  try {
    const { phone } = req.params;

    const isCustomerExist = await CustomerModel.findOne({ phone });
    if (!isCustomerExist) {
      return res
        .status(400)
        .json({ success: false, message: "Phone not exist" });
    }
    const coupon = await CouponModel.find({ phone });
    const totalRecords = await CouponModel.countDocuments({ phone });
    let message = "Coupon not fount";
    if (totalRecords) {
      message = "Coupon found";
    }

    return res.status(200).json({
      totalRecords: totalRecords,
      success: true,
      message: message,
      coupon: coupon,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
module.exports.getCouponCount = async (req, res, next) => {
  try {
    const { phone } = req.params;

    const isCustomerExist = await CustomerModel.findOne({ phone });
    if (!isCustomerExist) {
      return res
        .status(400)
        .json({ success: false, message: "Phone not exist" });
    }
    const coupon = await CouponModel.find({ phone });
    const totalRecords = await CouponModel.countDocuments({ phone });
    let message = "Coupon not fount";
    if (totalRecords) {
      message = "Coupon found";
    }

    return res
      .status(200)
      .json({ totalRecords: totalRecords, success: true, message: message });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

async function generateDynamicURL(
  uniqueReferenceNo,
  cashBackAmount,
  validityInDays
) {
  // Keys and IV
  const saltKey = "Rckd39KVomIlPaXhJTZpoYbJOq6kT9YaqNloWq";
  const encryptionKey = "743b1cf3fb4EEgWG4UJZONDprHa24125";
  const encryptionIV = "ABCDEFGHIJKLMNOP"; // Must be 16 bytes long

  // Step 1: Generate Checksum
  const checksum = generateChecksum(
    uniqueReferenceNo,
    cashBackAmount,
    validityInDays,
    saltKey
  );

  // Step 2: Prepare Data String with Checksum
  const dataString = `${uniqueReferenceNo}|${cashBackAmount}|${validityInDays}|${checksum}`;

  // Step 3: Encrypt the Data
  const encryptedString = encryptData(dataString, encryptionKey, encryptionIV);

  // URL-safe base64 encoding
  const replacedEncryptedOutput = encryptedString
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  // Step 4: Prepare the Final URL
  const requestURL = `https://repaykaro.rewardzpromo.com/Home.aspx?Data=${encodeURIComponent(
    replacedEncryptedOutput
  )}`;

  try {
    // Step 5: Send API request
    const response = await axios.get(requestURL, {
      headers: { Accept: "application/json" },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching the URL:", error.message);
    return null;
  }
}

/**
 * Generate checksum using SHA512 hash
 */
function generateChecksum(
  uniqueReferenceNo,
  cashBackAmount,
  validityInDays,
  saltKey
) {
  const data = `${uniqueReferenceNo}|${cashBackAmount}|${validityInDays}|${saltKey}`;
  return crypto.createHash("sha512").update(data).digest("hex");
}

/**
 * Encrypt data using AES-256-CBC
 */
function encryptData(data, encryptionKey, encryptionIV) {
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(encryptionKey, "utf8"),
    Buffer.from(encryptionIV, "utf8")
  );
  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}
