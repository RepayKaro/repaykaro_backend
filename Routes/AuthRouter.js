const express = require("express");
const checkPermission = require("../Middlewares/CheckPermissions.js");
const { ModuleNames, TaskEnum } = require("../Utils/constant.js");
const router = express.Router();
const AuthController = require("../Controllers/AuthController");
const UserController = require("../Controllers/UserController");
const AuthValidation = require("../Middlewares/AuthValidation");

router.post("/login", AuthValidation.loginValidation, AuthController.login);
router.post(
  "/create",
  checkPermission(ModuleNames.USER, TaskEnum.CREATE),
  AuthValidation.signupValidation,
  UserController.signup
);
router.get(
  "/list",
  checkPermission(ModuleNames.USER, TaskEnum.READ),
  AuthValidation.validateUserFilter,
  UserController.userList
);
router.put(
  "/update",
  checkPermission(ModuleNames.USER, TaskEnum.UPDATE),
  AuthValidation.updateValidation,
  UserController.updateUser
);
router.get("/profile", UserController.getProfile);
router.get(
  "/:id",
  checkPermission(ModuleNames.USER, TaskEnum.READ),
  UserController.getProfileById
);
router.post(
  "/inquiry",
  AuthController.inquiry
);

module.exports = router;
//test
