const express = require("express");
const router = express.Router();
const CustomerController = require("../Controllers/CustomerController");
const CustomerValidation = require("../Middlewares/CustomerValidation");
const checkPermission = require("../Middlewares/CheckPermissions.js");
const { ModuleNames, TaskEnum } = require("../Utils/constant.js");

router.post(
  "/uploadCustomers",
  checkPermission(ModuleNames.CUSTOMER, TaskEnum.CREATE),
  (req, res, next) => {
    if (!req.is("multipart/form-data")) {
      return res.status(400).json({
        message: "Invalid Content-Type. Use multipart/form-data",
        success: false,
      });
    }
    next();
  },
  (req, res, next) => {
    CustomerValidation.upload.single("file")(req, res, (err) => {
      if (err) {
        return res
          .status(400)
          .json({ message: "File is required.", success: false });
      }
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "File is required.", success: false });
      }
      next();
    });
  },
  CustomerValidation.validateExcelHeaders,
  CustomerController.uploadCustomers
);

// ✅ Corrected separate routes (no chaining)
router.get(
  "/list",
  checkPermission(ModuleNames.CUSTOMER, TaskEnum.READ),
  CustomerValidation.validateCustomerListFilter,
  CustomerController.customerList
);

router.put(
  "/updateCustomerPayment",
  checkPermission(ModuleNames.CUSTOMER, TaskEnum.UPDATE),
  CustomerValidation.validateCustomerPayment,
  CustomerController.updateCustomerPayment
);

module.exports = router;
