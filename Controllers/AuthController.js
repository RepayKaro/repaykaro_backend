const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../Models/User");
const InquirySchema = require("../Models/Inquiry");
const { inquiryMailFormateForClient, inquiryMailFormateForAdmin } = require("../Utils/mail-formate");
module.exports.inquiry = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;
    const inquiry = await InquirySchema.findOne({
      email,
      phone,
      caseClosed: false,
    });
    if (inquiry) {
      return res.status(409).json({
        message: "Inquiry already exists",
        success: false,
      });
    }
    const inquiryModel = new InquirySchema({
      firstName,
      lastName,
      email,
      phone,
      message
    });
    const result = await inquiryModel.save();
    if (result?._id) {
      //send email
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST, // smtpout.secureserver.net
        port: Number(process.env.EMAIL_PORT), // 465
        secure: true, // true for port 465
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const data = {
        fullName: `${firstName} ${lastName}`,
        email: email,
        phone: phone,
        message: message,
        // verificationUrl: `${process.env.ORIGIN_LIVE}/verify-inquiry?token=${result._id}`,
      };

      const clientHtml = await inquiryMailFormateForClient(data);
      const recipients = ["hr@truebusinessminds.com", "kamal.sharma@truebusinessminds.com", "mohit.bhardwaj@truebusinessminds.com"];
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        // to: recipients.join(", "),
        subject: "Inquiry Confirmation",
        html: clientHtml,
      };
      await transporter.sendMail(mailOptions);
      const adminHtml = await inquiryMailFormateForAdmin(data);
      const mailOptionsForAdmin = {
        from: process.env.EMAIL_FROM,
        to: recipients.join(", "),
        subject: "New Inquiry",
        html: adminHtml,
      };
      await transporter.sendMail(mailOptionsForAdmin);
    }
    return res.status(201).json({
      message: "Inquiry created successfully",
      success: true,
    });
  } catch (err) {
    console.log("getUser error:", err);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};
module.exports.signup = async (req, res) => {
  try {
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
      { _id: user._id, permissions: user?.permissions || [] },
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
      permissions: user?.permissions || [],
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
