const asyncHandler = require('express-async-handler');
const { ApiError } = require("../utils/AppError");
const { ApiResponse } = require("../utils/ApiResponse");
const User = require("../models/user.models");
const { uploadeOnCloundinary } = require("../utils/fileUplode");
const jwt = require("jsonwebtoken");

// ========================= REGISTER USER =========================
const registerUser = asyncHandler(async (req, res) => {
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

    res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));
});

// ========================= LOGIN USER =========================
const loginUser = asyncHandler(async (req, res) => {
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
        secure: false, // set to true in production
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res
        .status(200)
        .cookie("accessToken", accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000 // 15 minutes
        })
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, {
                user: await User.findById(user._id).select("-password -refreshToken"),
                accessToken,
                refreshToken
            }, "User logged in successfully")
        );
});

// ========================= LOGOUT USER =========================
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

    const cookieOptions = {
        httpOnly: true,
        secure: false, // set to true in production
        sameSite: "lax"
    };

    res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// ========================= REFRESH TOKEN =========================
const refreshToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request - no refresh token");
    }

    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded._id);
    if (!user || user.refreshToken !== incomingRefreshToken) {
        throw new ApiError(403, "Forbidden - Invalid refresh token");
    }

    const newAccessToken = user.generateAccessToken();

    const cookieOptions = {
        httpOnly: true,
        secure: false, // set to true in production
        sameSite: "lax",
        maxAge: 15 * 60 * 1000 // 15 minutes
    };

    res.cookie("accessToken", newAccessToken, cookieOptions);
    res.json(new ApiResponse(200, { accessToken: newAccessToken }, "Access token refreshed successfully"));
});

// ========================= CHANGE CURRENT PASSWORD =========================
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?.id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// ========================= EXPORTS =========================
module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshToken,
    changeCurrentPassword
};
