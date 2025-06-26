const Joi = require("joi");
module.exports.validateCreateOnlyCoupon = (req, res, next) => {
  const schema = Joi.object({
    amount: Joi.number().min(1).max(5000).required(),
    validity: Joi.number().min(1).max(365).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
  }
  next();
};
module.exports.validateCreateCouponAndUpdatePayment = (req, res, next) => {
  const schema = Joi.object({
    payment_type: Joi.number().min(1).max(3).required(),
    customer_id: Joi.string().required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
  }
  next();
};
module.exports.validateCouponScratch = (req, res, next) => {
  const schema = Joi.object({
    coupon_id: Joi.string().required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
  }
  next();
};
module.exports.validateGetAllCoupon = (req, res, next) => {
  const schema = Joi.object({
    phone: Joi.string()
      .pattern(/^[0-9]{10}$/) // Ensures exactly 10 digits
      .required()
      .messages({
        "string.pattern.base": "Phone number must be exactly 10 digits long.",
        "any.required": "Phone number is required.",
      }),
  });
  const { error } = schema.validate(req.params);
  if (error) {
    return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
  }
  next();
};
