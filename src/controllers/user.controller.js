import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import mongoose from "mongoose"

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
  }
  catch (error) {
    throw new ApiError(500, "Something went wrong while generating referesh and access token")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body

  const emptyField = [username, email, fullname, password].some(
    field => field?.trim() === ""
  )

  if (emptyField) {
    throw new ApiError(400, "All fields are required")
  }

  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists")
  }

  let avatarLocalPath, coverImageLocalPath

  if (req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0) {
    avatarLocalPath = req.files.avatar[0].path
  }

  if (req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new ApiError(400, "Cloudinary :: Avatar file is required")
  }

  const user = await User.create({
    email,
    fullname,
    password,
    username: username.toLowerCase(),
    avatar: {
      url: avatar.url,
      public_id: avatar.public_id
    },
    coverImage: {
      url: coverImage?.url || "",
      public_id: coverImage?.public_id || ""
    }
  })

  const registeredUser = user.removeFields(["password", "refreshToken"])

  if (!registeredUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { registeredUser },
        "User registered successfully"
      )
    )
})

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body

  if (!username && !email) {
    throw new ApiError(400, "username or email is required")
  }

  const user = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (!user) {
    throw new ApiError(404, "User does not exist with given email")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password")
  }

  const loggedinUser = user.removeFields(["password", "refreshToken"])

  if (!loggedinUser) {
    throw new ApiError(500, "Something went wrong while logging in the user")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
  const options = { httpOnly: true, secure: true }

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { loggedinUser, accessToken, refreshToken },
        "User logged In Successfully"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  )

  if (!user) {
    throw new ApiError(500, "Something went wrong while logging out the user")
  }

  const options = { httpOnly: true, secure: true }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out Successfully"))
})

const regenerateTokens = asyncHandler(async (req, res) => {
  const oldRefreshToken = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "")

  if (!oldRefreshToken) {
    throw new ApiError(401, "Unauthorized request")
  }

  const decodedToken = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  const user = await User.findById(decodedToken._id)

  if (!user) {
    throw new ApiError(401, "Invalid refresh token")
  }

  if (oldRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
  const options = { httpOnly: true, secure: true }

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken },
        "Tokens Regenerated Successfully"
      )
    )
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user: req.user },
        "User fetched successfully"
      )
    )
})

const changeEmail = asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email) {
    throw new ApiError(400, "Empty field")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { email } },
    { new: true }
  ).select("-password")

  if (!user) {
    throw new ApiError(500, "Something went wrong while updating the email")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user },
        "Account details updated successfully"
      )
    )

})

const changeFullname = asyncHandler(async (req, res) => {
  const { fullname } = req.body

  if (!fullname) {
    throw new ApiError(400, "Empty field")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullname } },
    { new: true }
  ).select("-password")

  if (!user) {
    throw new ApiError(500, "Something went wrong while updating the email")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { user },
        "Account details updated successfully"
      )
    )

})

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body

  if (!oldPassword && !newPassword) {
    throw new ApiError(400, "Empty fields")
  }

  const user = await User.findById(req.user?._id)
  const isPasswordValid = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old password")
  }

  user.password = newPassword
  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Password changed successfully")
    )
})

const changeAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const user = await User.findById(req.user?._id).select("-password")

  if (!user) {
    throw new ApiError(500, "Something went wrong while updating the Avatar")
  }

  await deleteFromCloudinary(user.avatar.public_id)
  user.avatar = { url: avatar.url, public_id: avatar.public_id }
  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(
      new ApiResponse(200, { user }, "Avatar image updated successfully")
    )
})

const changeCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  const user = await User.findById(req.user?._id).select("-password")

  if (!user) {
    throw new ApiError(500, "Something went wrong while updating the Cover image")
  }

  await deleteFromCloudinary(user.coverImage.public_id)
  user.coverImage = { url: coverImage.url, public_id: coverImage.public_id }
  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(
      new ApiResponse(200, { user }, "Cover image updated successfully")
    )
})

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id).select("-password")

  if (!user) {
    throw new ApiError(404, "User not found")
  }

  await deleteFromCloudinary(user.avatar?.public_id)
  await deleteFromCloudinary(user.coverImage?.public_id)
  await User.findByIdAndDelete(user._id)

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User deleted successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing")
  }

  const channelProfiles = await User.aggregate([
    {
      $match: { username: username.trim().toLowerCase() }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribes"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $addFields: {
        isSubscribed: { $in: [req.user?._id, "$subscribers.subscriber"] },
        subscribesCount: { $size: "$subscribes" },
        subscribersCount: { $size: "$subscribers" }
      }
    },
    {
      $project: {
        email: 1,
        username: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,
        isSubscribed: 1,
        subscribesCount: 1,
        subscribersCount: 1
      }
    }
  ])

  if (!channelProfiles?.length) {
    throw new ApiError(404, "Channel does not exists")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { channelProfile: channelProfiles[0] },
        "User channel fetched successfully"
      )
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {
  const users = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(String(req.user?._id))
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchedVideoIds",
        foreignField: "_id",
        as: "watchedVideoDetails",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "ownerId",
              foreignField: "_id",
              as: "ownerDetail",
              pipeline: [
                {
                  $project: {
                    avatar: 1,
                    username: 1,
                    fullName: 1
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              ownerDetail: {
                $first: "$ownerDetail"
              }
            }
          }
        ]
      }
    }
  ])

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { watchHistory: users[0].watchedVideoDetails },
        "Watch history fetched successfully"
      )
    )
})

export {
  registerUser,
  loginUser,
  logoutUser,
  regenerateTokens,
  getCurrentUser,
  changeEmail,
  changeFullname,
  changePassword,
  changeAvatar,
  changeCoverImage,
  deleteUser,
  getUserChannelProfile,
  getWatchHistory
}