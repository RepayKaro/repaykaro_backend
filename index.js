const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const AuthRouter = require("./Routes/AuthRouter");
const CustomerRouter = require("./Routes/CustomerRouter");
const CheckJWT = require("./Middlewares/Auth");
const CouponRouter = require("./Routes/CouponRouter");
const ClientRouter = require("./Routes/ClientRouter");
const DashboardRouter = require("./Routes/DashboardRoute");
const responseTime = require("./Middlewares/ResponseTime");

require("dotenv").config();
require("./Models/db");
const PORT = process.env.PORT || 5000;

app.get("/ping", (req, res) => {
  res.send("PONG");
});

app.use(bodyParser.json());
app.use(
  cors({
    origin: "https://repaykaro.com",
    // origin: "http://localhost:5173",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Log every incoming request
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});


app.use(responseTime);
app.use("/api/v1/auth", AuthRouter);
app.use("/api/v1/users",CheckJWT.ensureAuthenticated, AuthRouter);
app.use("/api/v1/customers", CheckJWT.ensureAuthenticated, CustomerRouter);
app.use("/api/v1/coupons", CheckJWT.ensureAuthenticated, CouponRouter);
app.use("/api/v1/updateCoupon", CouponRouter);
app.use("/api/v1/clientAuth", ClientRouter);
app.use("/api/v1/clients", CheckJWT.ensureAuthenticated, ClientRouter);
app.use("/api/v1/profile", CheckJWT.ensureAuthenticated, AuthRouter);
app.use("/api/v1/dashboard", CheckJWT.ensureAuthenticated, DashboardRouter);
// Root route: show welcome message or API status
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the API server!",
    status: "running",
    documentation: "https://api.repaykaro.com",
  });
});

// 404 handler for all unmatched routes
app.use((req, res, next) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
