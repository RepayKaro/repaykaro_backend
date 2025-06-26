const express = require("express");
const router = express.Router();
const AuthController = require("../Controllers/clients/ClientAuthController");
const AuthValidation = require("../Middlewares/clients/ClientAuthValidation");
const { upload } = require("../Utils/s3-config"); // ✅ Destructure the named export

router.post("/login", AuthValidation.phoneValidation, AuthController.login);
router.post(
  "/validate-otp",
  AuthValidation.otpValidation,
  AuthController.validateOtp
);

router.get("/get-client", AuthController.getClientDetails);
router.get("/get-coupon", AuthController.getCouponDetails);
router.get("/get-timeline", AuthController.getTimeline);

router.post("/coupon-scratch", AuthController.scratchCoupon);
router.post("/coupon-redeem", AuthController.redeemCoupon);
router.post(
  "/upload-payment-screenshot",
  upload,
  AuthController.uploadPaymentScreenShot
);

router.get("/get-screenshot", AuthController.getScreenshot);
router.delete(
  "/delete-screenshot/:screenShotId",
  AuthController.deleteScreenshot
);

module.exports = router;
