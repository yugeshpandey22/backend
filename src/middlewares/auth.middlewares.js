const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const verifyJWT = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        
        if (!token) {
            return res.status(401).json({ success: false, message: "Unauthorized request" });
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        req.user = await User.findById(decoded._id).select("-password -refreshToken");

        if (!req.user) {
            return res.status(401).json({ success: false, message: "Invalid Access Token" });
        }

        next();
    } catch (error) {
        console.error("verifyJWT Error:", error);
        res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

module.exports = { verifyJWT };
