const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getWatchHistory // <-- add this
} = require("../controllers/user.controllers.js");

const { upload } = require("../middlewares/multer.middlerware.js");
const { verifyJWT } = require("../middlewares/auth.middlewares.js");

// ================== AUTH ROUTES ==================
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
router.post("/refresh-token", refreshToken);

// ================== USER ROUTES ==================
router.get("/current-user", verifyJWT, getCurrentUser);

router.patch("/update-account", verifyJWT, updateAccountDetails);

router.patch(
  "/update-avatar",
  verifyJWT,
  upload.single("avatar"),
  updateUserAvatar
);

router.patch(
  "/update-cover-image",
  verifyJWT,
  upload.single("coverImage"),
  updateUserCoverImage
);

// ================== WATCH HISTORY ROUTE ==================
router.get("/watch-history", verifyJWT, getWatchHistory); // <-- added

module.exports = router;
