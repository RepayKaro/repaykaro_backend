const express = require("express");
const router = express.Router();
const DashboardController = require("../Controllers/DashboardController");
const checkPermission = require("../Middlewares/CheckPermissions.js");
const { ModuleNames, TaskEnum } = require("../Utils/constant.js");

router.get(
  "/",
  DashboardController.dashboard
);

module.exports = router;
