const { ApiError } = require("../utils/AppError");
const { ApiResponse } = require("../utils/ApiResponse");
const { User } = require("../models/user.models");
const { uploadeOnCloundinary } = require("../utils/fileUplode");

const registerUser = async (req, res) => {
    try {
        const { fullName, email, username, password } = req.body;

        console.log("Email:", email);
        console.log("Password:", password);

        // 1️⃣ Check for empty fields
        if ([fullName, email, username, password].some((field) => !field || field.trim() === "")) {
            throw new ApiError(400, "All fields are required");
        }

        // 2️⃣ Check if user already exists
        const existUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existUser) {
            throw new ApiError(409, "User with email or username already exists");
        }

        // 3️⃣ File paths (multer fields)
        const avatarLocalPath = req.files?.avatar?.[0]?.path;
        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required");
        }

        // 4️⃣ Upload to Cloudinary
        const avatar = await uploadeOnCloundinary(avatarLocalPath);
        const coverImage = coverImageLocalPath
            ? await uploadeOnCloundinary(coverImageLocalPath)
            : null;

        if (!avatar) {
            throw new ApiError(400, "Error uploading avatar file");
        }

        // 5️⃣ Create new user
        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        });

        // 6️⃣ Get user without sensitive fields
        const createdUser = await User.findById(user._id).select("-password -refreshToken");

        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering user");
        }

        // 7️⃣ Send success response
        return res.status(201).json(
            new ApiResponse(201, createdUser, "User registered successfully")
        );

    } catch (error) {
        console.error("Register User Error:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

module.exports = { registerUser };
