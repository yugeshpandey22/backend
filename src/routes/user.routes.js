// src/routes/user.routes.js
const express = require("express");
const router = express.Router();

const { registerUser } = require("../controllers/user.controllers.js");
const { upload } = require("../middlewares/multer.middlerware.js");

// FIX: upload.fields(...) MUST be used as middleware inside router.post(...) not separately.
// Previously you placed upload.fields(...) after route definition which did nothing.

router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
  ]),
  registerUser
);

module.exports = router;
