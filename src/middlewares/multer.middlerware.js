// src/middlewares/multer.middlerware.js
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Ensure temp folder exists
const tempDir = path.join(__dirname, "..", "..", "public", "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir); // previously you used "./public/temp" — ok, but better to resolve absolute path
  },
  filename: function (req, file, cb) {
    // FIX: use unique filename to avoid collisions
    cb(null, Date.now() + "-" + file.originalname);
  }
});

// Optional: accept only images and limit size
const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// FIX: earlier you had `export const upload = ...` which throws syntax error in CommonJS.
// Now we export in CommonJS style:
module.exports = { upload };
