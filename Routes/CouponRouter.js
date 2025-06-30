const express = require("express");
const router = express.Router();
const checkPermission = require("../Middlewares/CheckPermissions.js");
const { ModuleNames, TaskEnum } = require("../Utils/constant.js");
const CouponController = require("../Controllers/CouponController");
const ThirdPartyCouponController = require("../Controllers/ThirdPartyCouponController");
// Import Middlewares
const CouponValidator = require("../Middlewares/CouponValidator");

// Define Routes (cleaner and easier to read)
router.post(
  "/create-only-coupon",
  checkPermission(ModuleNames.COUPON, TaskEnum.CREATE),
  CouponValidator.validateCreateOnlyCoupon,
  CouponController.createOnlyCoupon
);

router.post(
  "/create-coupon-update-payment",
  checkPermission(ModuleNames.COUPON, TaskEnum.UPDATE),

  CouponValidator.validateCreateCouponAndUpdatePayment,
  CouponController.createCouponAndUpdatePayments
);

router.post(
  "/coupon-scratch",
  // checkPermission(ModuleNames.COUPON, TaskEnum.UPDATE),

  CouponValidator.validateCouponScratch,
  CouponController.scratchCoupon
);

router.get(
  "/get-all-coupon/:phone",
  checkPermission(ModuleNames.COUPON, TaskEnum.READ),

  CouponValidator.validateGetAllCoupon,
  CouponController.getAllCoupon
);

router.get(
  "/get-coupon-count/:phone",
  checkPermission(ModuleNames.COUPON, TaskEnum.READ),

  CouponValidator.validateGetAllCoupon,
  CouponController.getCouponCount
);
router.get("/", ThirdPartyCouponController.updateRealtimeCouponByThirdParty);

// this is testing url for genearting dynamic url for third party
router.post(
  "/createDynamicURL",
  CouponController.createDynamicURL
);

module.exports = router;
