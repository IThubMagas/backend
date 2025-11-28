const path = require('path');
const multer = require("multer");

const storage = multer.diskStorage({
    destination: function (req, res, cb) {
        const fs = require('fs');
        const dir = 'uploads/achievements/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    },
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, callback) {
        if (
            file.mimetype === "image/png" ||
            file.mimetype === "image/jpg" ||
            file.mimetype === "image/jpeg" ||
            file.mimetype === "image/webp" ||
            file.mimetype === "application/pdf" ||
            file.mimetype === "application/msword" ||
            file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
            callback(null, true);
        } else {
            console.log("Допускаются  только файлы формата JPG/JPEG/PNG/PDF/DOC/DOCX");
            callback(new Error("Ошибка загрузки"), false);
        }

    },
    limits: {
        fileSize: 1024 * 1024 * 40
    }
});

module.exports = upload;