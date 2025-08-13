const asyncHandler = require('express-async-handler');
const { ApiError } = require("../utils/AppError");
const { ApiResponse } = require("../utils/ApiResponse");
const User = require("../models/user.models");
const { uploadeOnCloundinary } = require("../utils/fileUplode");
const jwt = require("jsonwebtoken");

const Video = require("../models/video.models"); // <- ensure correct path


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


// ========================= GET CURRENT USER =========================
const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Current user fetched successfully"));
});

// ========================= UPDATE ACCOUNT DETAILS =========================
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName && !email) {
        throw new ApiError(400, "At least one field (fullName or email) is required");
    }

    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;

    await user.save({ validateBeforeSave: false });

    const updatedUser = await User.findById(user._id).select("-password -refreshToken");
    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Account details updated successfully"));
});

// ========================= UPDATE USER AVATAR =========================
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadeOnCloundinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Error uploading avatar file");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { avatar: avatar.url },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// ========================= UPDATE USER COVER IMAGE =========================
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required");
    }

    const coverImage = await uploadeOnCloundinary(coverImageLocalPath);
    if (!coverImage) {
        throw new ApiError(400, "Error uploading cover image file");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { coverImage: coverImage.url },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = async (req, res) => {
    try {
        const { channelId } = req.params; // jis channel ka profile chahiye
        const currentUserId = req.user?._id; // login user ka id

        const channelData = await User.aggregate([
            {
                $match: { _id: new mongoose.Types.ObjectId(channelId) }
            },
            // Subscribers count
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            // SubscribedTo count
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            // Add extra fields
            {
                $addFields: {
                    subscribersCount: { $size: "$subscribers" },
                    subscribedToCount: { $size: "$subscribedTo" },
                    isSubscribed: {
                        $cond: {
                            if: {
                                $in: [
                                    new mongoose.Types.ObjectId(currentUserId),
                                    "$subscribers.subscriber"
                                ]
                            },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            // Sirf required fields return karo
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    email: 1,
                    avatar: 1,
                    coverImage: 1,
                    subscribersCount: 1,
                    subscribedToCount: 1,
                    isSubscribed: 1
                }
            }
        ]);

        if (!channelData.length) {
            return res.status(404).json({ success: false, message: "Channel not found" });
        }

        res.status(200).json({
            success: true,
            data: channelData[0]
        });

    } catch (error) {
        console.error("getUserChannelProfile Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


const getWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const result = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },

    // Lookup videos in watchHistory
    {
      $lookup: {
        from: "videos",
        let: { videoIds: "$watchHistory" },
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$videoIds"] } } },

          // Preserve original order
          { $addFields: { order: { $indexOfArray: ["$$videoIds", "$_id"] } } },
          { $sort: { order: -1 } },

          // Populate owner info
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                { $project: { fullName: 1, username: 1, avatar: 1 } }
              ]
            }
          },
          { $addFields: { owner: { $first: "$owner" } } },

          // Return only required fields
          {
            $project: {
              title: 1,
              thumbnail: 1,
              duration: 1,
              views: 1,
              createdAt: 1,
              owner: 1
            }
          },

// ✅ Add Likes/Dislikes and Saved
        {
          $addFields: {
            isLiked: { $in: [new mongoose.Types.ObjectId(userId), "$likes"] },
            isDisliked: { $in: [new mongoose.Types.ObjectId(userId), "$dislikes"] },
            isSaved: { $in: [new mongoose.Types.ObjectId(userId), "$savedBy"] }
          }
        },

        // Final projection for FE
        {
          $project: {
            title: 1,
            thumbnail: 1,
            duration: 1,
            views: 1,
            createdAt: 1,
            owner: 1,
            isLiked: 1,
            isDisliked: 1,
            isSaved: 1
          }
        }
    

        ],
        as: "watchHistory"
      }
    },

    { $project: { watchHistory: 1, _id: 0 } }
  ]);

  const history = result?.[0]?.watchHistory || [];
  return res.status(200).json(new ApiResponse(200, history, "Watch history fetched successfully"));
});



// ========================= EXPORTS =========================
module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
   updateUserCoverImage,
   getUserChannelProfile,
   getWatchHistory
 


};

