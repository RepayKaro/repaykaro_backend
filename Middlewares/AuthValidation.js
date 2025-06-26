const Joi = require("joi");

module.exports.signupValidation = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(100).required().messages({
      "string.base": "Name must be a string",
      "string.min": "Name must be at least 3 characters long",
      "string.max": "Name cannot exceed 100 characters",
      "any.required": "Name is required",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Email must be a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string()
      .min(8)
      .max(16)
      .pattern(/^(?=.*[a-zA-Z])(?=.*\d)/) // At least one letter and one number
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.max": "Password cannot exceed 16 characters",
        "string.pattern.base":
          "Password must contain at least one letter and one number",
        "any.required": "Password is required",
      }),
    isActive: Joi.boolean().optional().messages({
      "boolean.base": "isActive must be a boolean",
    }),
    permissions: Joi.array()
      .items(
        Joi.object({
          module: Joi.string()
            .required()
           ,
          actions: Joi.array()
            .items(
              Joi.string()
                .valid("create", "read", "update", "delete")
                .messages({
                  "any.only":
                    "Actions must be one of: create, read, update, delete",
                })
            )
            .required()
            .messages({
              "array.base": "Actions must be an array",
              "any.required": "Actions are required in permissions",
            }),
        })
      )
      .optional()
      .messages({
        "array.base": "Permissions must be an array",
      }),
  });

  // Validate the request body
  const { error } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
   return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
  }

  next();
};
module.exports.loginValidation = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(4).max(100).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
  }
  next();
};
module.exports.validateUserFilter = (req, res, next) => {
  const schema = Joi.object({
    page: Joi.number().min(1).required(),
    perPage: Joi.number().min(1).required(),
    name: Joi.string().allow("").optional(), // Allow empty string
    email: Joi.string().email().allow("").optional(), // Allow empty string
  });
  const { error } = schema.validate(req.query);
  if (error) {
    console.log(error.details[0].message);
    return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
  }
  next();
};
module.exports.updateValidation = (req, res, next) => {
  const schema = Joi.object({
    _id: Joi.string().required(),
    name: Joi.string().min(3).optional(), // Allow empty string
    email: Joi.string().email().required(), // Allow empty string
    password: Joi.string().min(4).max(16).optional(),
    isActive: Joi.boolean().truthy("true").falsy("false").optional(),
    permissions: Joi.array()
      .items(
        Joi.object({
          module: Joi.string()
            .required()
            ,
          actions: Joi.array()
            .items(
              Joi.string()
                .valid("create", "read", "update", "delete")
                .messages({
                  "any.only":
                    "Actions must be one of: create, read, update, delete",
                })
            )
            .required()
            .messages({
              "array.base": "Actions must be an array",
              "any.required": "Actions are required in permissions",
            }),
        })
      )
      .optional()
      .messages({
        "array.base": "Permissions must be an array",
      }),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    console.log(error.details[0].message);
    return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
  }
  next();
};
