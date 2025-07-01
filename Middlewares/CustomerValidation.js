const Joi = require("joi");
const multer = require("multer");
const path = require("path");
const xlsx = require("xlsx");

// Multer storage setup
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// File filter for only Excel files
const fileFilter = (req, file, cb) => {
  if (!file) {
    return cb(new Error("File is required"), false);
  } else if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel (.xlsx) files are allowed!"), false);
  }
};

const upload = multer({ storage, fileFilter });
module.exports.upload = upload;

// ✅ Validate Excel file headers
module.exports.validateExcelHeaders = (req, res, next) => {
  try {
    // Read the uploaded file
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
    });

    if (!sheetData.length) {
      return res.status(400).json({
        message: "Excel file is empty",
        success: false,
      });
    }

    // Extract headers from first row
    const requiredHeaders = [
      "customer",
      "phone",
      "fore_closure",
      "settlement",
      "minimum_part_payment",
      "foreclosure_reward",
      "settlement_reward",
      "minimum_part_payment_reward",
      "payment_url",
      "lender_name"
    ];
    const fileHeaders = sheetData[0].map((header) =>
      header.toLowerCase().trim()
    );

    // Check if all required headers exist
    const missingHeaders = requiredHeaders.filter(
      (header) => !fileHeaders.includes(header)
    );

    if (missingHeaders.length) {
      return res.status(400).json({
        message: "Missing required headers",
        missingHeaders,
        success: false,
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      message: "Error processing Excel file",
      error: err.message,
      success: false,
    });
  }
};
module.exports.validateCustomerListFilter = (req, res, next) => {
  console.log(req.query);

  const schema = Joi.object({
    page: Joi.number().min(1).required(),
    perPage: Joi.alternatives()
      .try(
        Joi.number().min(1).required(),
        Joi.string().valid('All').required()
      )
      .required()
      .custom((value) => {
        if (value === 'All') return value; // Keep "All" as string
        return Number(value); // Convert numbers/strings to number
      }),
    filter: Joi.number().min(-1).max(3).required(),
    phone: Joi.string().allow("").optional(), // Allow empty string
    customer: Joi.string().allow("").optional(), // Allow empty string
    lender: Joi.string().allow("").optional(), // Allow empty string
    type: Joi.string().allow("").optional(),
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
module.exports.validateCustomerPayment = (req, res, next) => {
  const schema = Joi.object({
    customer_id: Joi.string().required(),
    payment_type: Joi.number().min(1).max(3).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    return res
      .status(400)
      .json({ message: error.details[0].message, success: false });
  }
  next();
};
