const jwt = require("jsonwebtoken");

module.exports.ensureAuthenticated = (req, res, next) => {
  // Get the authorization header (case-insensitive)
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader) {
    return res.status(403).json({
      message: "Unauthorized, JWT token is required",
      success: false,
    });
  }

  // Check if it's a Bearer token
  const [bearer, token] = authHeader.split(" ");
  if (bearer !== "Bearer" || !token) {
    return res.status(403).json({
      message: "Invalid authorization format. Use Bearer token",
      success: false,
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (err) {
    return res.status(403).json({
      message: "Invalid authorization format. Use Bearer token",
      success: false,
    });
  }
};
