const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../Models/User");
module.exports.signup = async (req, res) => {
  try {
    //this is comment
    const { name, email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (user) {
      return res.status(409).json({
        message: "User is already exist, you can login",
        success: false,
      });
    }
    const userModel = new UserModel({ name, email, password });
    userModel.password = await bcrypt.hash(password, 10);
    await userModel.save();
    return res.status(201).json({
      message: "Signup successfully",
      success: true,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server errror",
      success: false,
    });
  }
};

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email }).select("+password");
    let errorMsg = "Auth failed email or password is wrong";
    if (!user) {
      return res.status(403).json({ message: errorMsg, success: false });
    }
    const isPassEqual = await bcrypt.compare(password, user.password);
    if (!isPassEqual) {
      return res.status(403).json({ message: errorMsg, success: false });
    }
    if (!user.isActive) {
      errorMsg = "Your account is not active.";
      return res.status(403).json({ message: errorMsg, success: false });
    }
    //testiiii
    const jwtToken = jwt.sign(
      { _id: user._id, permissions: user?.permissions||[] },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.ADMIN_TOKEN_EXPIRY,
      }
    );

    return res.status(200).json({
      message: "Login Success",
      success: true,
      jwtToken,
      email,
      name: user.name,
      permissions: user?.permissions||[]
    });
  } catch (err) {
    console.log("login error:", err);
    return res.status(500).json({
      message: "Internal server errror",
      success: false,
    });
  }
};

//test
