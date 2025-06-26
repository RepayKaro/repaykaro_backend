// config/s3Config.js
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_S3_BUCKET_ACCESS_KEY,
        secretAccessKey: process.env.AWS_S3_BUCKET_SECRET_KEY,
    },
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        

        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, `repaykaro/${Date.now().toString()}-${file.originalname}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error("Only images (jpeg, jpg, png, gif) are allowed!"));
        }
    },
}).any();

const deleteFileFromS3 = async (key) => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key,
        });
        await s3.send(command);
        console.log(`✅ Deleted: ${key}`);
    } catch (error) {
        console.error(`❌ Failed to delete ${key} from S3:`, error.message);
        throw error;
    }
};

module.exports = {
    upload,
    deleteFileFromS3,
};
