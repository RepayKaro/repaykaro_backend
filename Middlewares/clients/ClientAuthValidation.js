const Joi = require('joi');


module.exports.phoneValidation = (req, res, next) => {
    const schema = Joi.object({
        phone: Joi.string()
            .pattern(/^[0-9]{10}$/) // Ensures exactly 10 digits
            .required()
            .messages({
                "string.pattern.base": "Phone number must be exactly 10 digits long.",
                "any.required": "Phone number is required."
            })

    });
    const { error } = schema.validate(req.body);
    if (error) {
        return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
    }
    next();
}

module.exports.otpValidation = (req, res, next) => {
    const schema = Joi.object({
        phone: Joi.string()
            .pattern(/^[0-9]{10}$/) // Ensures exactly 10 digits
            .required()
            .messages({
                "string.pattern.base": "Phone number must be exactly 10 digits long.",
                "any.required": "Phone number is required."
            }),
        otp: Joi.number().required()

    });
    const { error } = schema.validate(req.body);
    if (error) {
        return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
    }
    next();

}

module.exports.screenShotIdValidation = (req, res, next) => {
    const schema = Joi.object({
        screenShotId: Joi.string()
           
            .required()
            .messages({
                "string.pattern.base": "screenShotId formate not match.",
                "any.required": "PscreenShotId is required."
            }),
        otp: Joi.number().required()

    });
    const { error } = schema.validate(req.body);
    if (error) {
        return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
    }
    next();

}

