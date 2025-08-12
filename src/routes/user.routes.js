const express = require("express");
const router = express.Router();

const { registerUser, loginUser, logoutUser, refreshToken } = require("../controllers/user.controllers.js");
const { upload } = require("../middlewares/multer.middlerware.js");
const { verifyJWT } = require("../middlewares/auth.middlewares.js");

router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
  ]),
  registerUser
);

router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.post("/refresh-token",refreshToken);

module.exports = router;
