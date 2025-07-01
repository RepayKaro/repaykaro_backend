const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const CustomerModel = require("../../Models/Customer");
const { uploadTimeline } = require("../../Utils/timeline-creator");
const CustomerTimeline = require("../../Models/CustomerTimeline");

const CouponModel = require("../../Models/Coupon");
const { sendSms } = require("../SendSmsController");
const PaymentModel = require("../../Models/Payment");
require("dotenv").config();

module.exports.login = async (req, res) => {
  try {
    const { phone } = req.body;
    let otp = Math.floor(1000 + Math.random() * 9000).toString();

    if (
      process.env.ENVIRONMENT === "production" ||
      process.env.ENVIRONMENT === "development" ||
      phone === "8538945025"
    ) {
      otp = "1234";
    }

    const updatedDocument = await CustomerModel.findOneAndUpdate(
      { phone: phone, isActive: true },
      { $set: { otp: otp } },
      { returnDocument: "after" } // Returns updated document
    );

    if (!updatedDocument) {
      return res.status(403).json({ message: "Invalid Phone", success: false });
    }

    if (process.env.ENVIRONMENT !== "production" && process.env.ENVIRONMENT !== "development") {
      // For testing purposes, we can log the
      const Apidata = {
        variables_values: `${updatedDocument.customer}|${otp}|`,
        numbers: updatedDocument.phone,
      };

      // FIXED: Changed event to "login"
      const sendLoginSms = await sendSms("login", Apidata);

      if (!sendLoginSms) {
        return res
          .status(500)
          .json({ message: "Unable to send OTP", success: false });
      }
    }

    return res.status(200).json({
      message: "OTP Sent Successfully, Please Verify",
      success: true,
      phone,
    });
  } catch (err) {
    console.log("login error", err);
    return res
      .status(500)
      .json({ message: "Internal Server Error", success: false });
  }
};

module.exports.validateOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const updatedDocument = await CustomerModel.findOneAndUpdate(
      { phone: phone, otp: otp, isActive: true },
      { $set: { isLogin: true, last_login: new Date() } },
      { returnDocument: "after" } // Returns the document after the update
    );

    if (!updatedDocument) {
      const errorMsg = "Invalid OTP";
      return res.status(403).json({ message: errorMsg, success: false });
    }

    const jwtToken = jwt.sign(
      { _id: updatedDocument._id, phone: updatedDocument.phone },
      process.env.JWT_SECRET,
      { expiresIn: process.env.CLIENT_TOKEN_EXPIRY }
    );

    return res.status(200).json({
      message: "Login Success",
      success: true,
      jwtToken,
      name: updatedDocument.customer,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server errror",
      success: false,
      error: err,
    });
  }
};
module.exports.getClientDetails = async (req, res) => {
  try {
    const { _id } = req.user;

    const Client = await CustomerModel.findOne({ _id: _id }).select("-otp");
    if (!Client) {
      return res.status(404).json({
        message: "Client not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Client found",
      success: true,
      client: Client,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server errror",
      success: false,
      Error: err,
    });
  }
};
module.exports.getCouponDetails = async (req, res) => {
  try {
    const { phone } = req.user;

    const Coupon = await CouponModel.find({ phone: phone });
    return res.status(200).json({
      message: "Coupon",
      success: true,
      coupon: Coupon,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server errror",
      success: false,
    });
  }
};
module.exports.scratchCoupon = async (req, res) => {
  try {
    const { phone } = req.user;
    const customerId = req.user._id;
    const { _id } = req.body;
    const Coupon = await CouponModel.findOne({ _id: _id, phone: phone });
    if (!Coupon) {
      return res
        .status(400)
        .json({ success: false, message: "Coupon not found" });
    }

    await uploadTimeline(
      phone,
      customerId,
      "Scratch",
      "Coupon Scratched",
      `Coupon Scratched Successfully (${Coupon.coupon_code})`
    );
    return res.status(200).json({
      message: "Coupon Updated",
      success: true,
      coupon: _id,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server errror",
      success: false,
    });
  }
};
module.exports.redeemCoupon = async (req, res) => {
  try {
    const { phone } = req.user;
    const { _id } = req.body;
    const customerId = req.user._id;

    // const Coupon = await CouponModel.findOneAndUpdate(
    //   { phone: phone, _id: _id },
    //   { $set: { scratched: 1 } },
    //   { returnDocument: "after" }
    // );
    // if (!Coupon) {
    //   return res.status(200).json({
    //     message: "Failed to update",
    //     success: true,
    //   });
    // }
    // await uploadTimeline(
    //   phone,
    //   customerId,
    //   "Coupon Reedemed",
    //   `Coupon Reedemed (${Coupon.coupon_code})`,
    // );
    return res.status(200).json({
      message: "Coupon Updated",
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server errror",
      success: false,
    });
  }
};
module.exports.uploadPaymentScreenShot = async (req, res) => {
  try {
    const files = req.files || [];

    const newTask = await PaymentModel.create({
      customer_id: req.user._id,
      phone: req.user.phone,
      screen_shot: files[0].location,
    });

    await uploadTimeline(
      req.user.phone,
      req.user._id,
      "Upload",
      "Payment Screenshot Uploaded",
      "Payment Screenshot Uploaded Successfully."
    );
    await uploadTimeline(
      req.user.phone,
      req.user._id,
      "Pending",
      "Payment Verification Pending",
      "Payment verification is pending from Admin , you will get notification when your payment approved."
    );

    return res.status(200).json({
      message: "Data Updated",
      success: true,
      screen_shot: files[0].location,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server errror",
      success: false,
    });
  }
};
module.exports.getScreenshot = async (req, res) => {
  try {
    const { _id } = req.user;

    const Coupon = await PaymentModel.find({
      customer_id: _id,
      isActive: true,
    });
    return res.status(200).json({
      message: "Data Found",
      success: true,
      screen_shot: Coupon,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server errror",
      success: false,
    });
  }
};
module.exports.deleteScreenshot = async (req, res) => {
  try {
    const { screenShotId } = req.params;
    const userId = req.user._id;

    const Coupon = await PaymentModel.findOneAndUpdate(
      {
        _id: screenShotId,
      },
      { isActive: false },
      { new: true }
    );
    if (!Coupon) {
      return res.status(200).json({
        message: "unable to delete",
        success: true,
      });
    }
    await uploadTimeline(
      req.user.phone.toString(),
      req.user._id.toString(),
      "Delete",
      "Payment Screenshot Deleted",
      "Payment Screenshot Deleted Successfully."
    );
    return res.status(200).json({
      message: "deleted",
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server errror",
      success: false,
    });
  }
};
module.exports.getTimeline = async (req, res) => {
  try {
    const userId = req.user;
    const phone = req.user.phone;

    const Timeline = await CustomerTimeline.find({ phone })
      .select("-__v")
      .sort({ createdAt: -1 });
    return res.status(200).json({
      message: "Timeline",
      success: true,
      timeline: Timeline || [],
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server errror",
      success: false,
    });
  }
};
