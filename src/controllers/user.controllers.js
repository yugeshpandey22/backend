const { ApiError } = require("../utils/AppError");
const { ApiResponse } = require("../utils/ApiResponse");
const { User } = require("../models/user.models");
const { uploadeOnCloundinary } = require("../utils/fileUplode");

// ========================= REGISTER USER =========================
const registerUser = async (req, res) => {
    try {
        const { fullName, email, username, password } = req.body;

        if ([fullName, email, username, password].some((field) => !field || field.trim() === "")) {
            throw new ApiError(400, "All fields are required");
        }

        const existUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existUser) {
            throw new ApiError(409, "User with email or username already exists");
        }

        const avatarLocalPath = req.files?.avatar?.[0]?.path;
        const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
        if (!avatarLocalPath) {
            throw new ApiError(400, "Avatar file is required");
        }

        const avatar = await uploadeOnCloundinary(avatarLocalPath);
        const coverImage = coverImageLocalPath
            ? await uploadeOnCloundinary(coverImageLocalPath)
            : null;

        if (!avatar) {
            throw new ApiError(400, "Error uploading avatar file");
        }

        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            username: username.toLowerCase()
        });

        const createdUser = await User.findById(user._id).select("-password -refreshToken");
        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering user");
        }

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

// ========================= LOGIN USER =========================
const loginUser = async (req, res) => {
    try {
        const { email, username, password } = req.body;

        if ((!email && !username) || !password) {
            throw new ApiError(400, "Email/Username and password are required");
        }

        const user = await User.findOne({ $or: [{ email }, { username }] });
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid credentials");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: "strict"
        };

        res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
                new ApiResponse(200, {
                    user: await User.findById(user._id).select("-password -refreshToken"),
                    accessToken,
                    refreshToken
                }, "User logged in successfully")
            );

    } catch (error) {
        console.error("Login User Error:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

// ========================= LOGOUT USER =========================
const logoutUser = async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: "strict"
        };

        res
            .status(200)
            .clearCookie("accessToken", cookieOptions)
            .clearCookie("refreshToken", cookieOptions)
            .json(new ApiResponse(200, {}, "User logged out successfully"));

    } catch (error) {
        console.error("Logout User Error:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};

module.exports = { registerUser, loginUser, logoutUser };
