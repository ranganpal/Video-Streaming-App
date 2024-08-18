import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"

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

  const avatarLocalPath = (req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) ? req.files.avatar[0].path : null

  const coverImageLocalPath = (req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) ? req.files.coverImage[0].path : null

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new ApiError(500, "Something went wrong while uplaoding avatar file in cloudinary")
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
    throw new ApiError(400, "Email is missing")
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { email } },
    { new: true }
  ).select("-password")

  if (!updatedUser) {
    throw new ApiError(500, "Something went wrong while updating the email")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updatedUser },
        "Email updated successfully"
      )
    )
})

const changeFullname = asyncHandler(async (req, res) => {
  const { fullname } = req.body

  if (!fullname) {
    throw new ApiError(400, "Fullname is missing")
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullname } },
    { new: true }
  ).select("-password")

  if (!updatedUser) {
    throw new ApiError(500, "Something went wrong while updating the email")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updatedUser },
        "Fullname updated successfully"
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

  const oldAvatar = await deleteFromCloudinary(req.user?.avatar.publicId)

  if (!oldAvatar) {
    throw new ApiError(500, "Something went wrong while deleting the old avatar from cloudinary")
  }

  const newAvatar = await uploadOnCloudinary(avatarLocalPath)

  if (!newAvatar) {
    throw new ApiError(500, "Something went wrong while uploading the new avatar in cloudinary")
  }

  const updateaUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: {
          url: newAvatar.url,
          publicId: newAvatar.public_id
        }
      }
    },
    { new: true }
  ).select("-password")

  if (!updateaUser) {
    throw new ApiError(500, "Something went wrong while updating the avatar")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updateaUser },
        "Avatar image updated successfully")
    )
})

const changeCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing")
  }

  const oldCoverImage = await deleteFromCloudinary(req.user?.coverImage.publicId)

  if (!oldCoverImage) {
    throw new ApiError(500, "Something went wrong while deleting the old cover image from cloudinary")
  }

  const newCoverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!newCoverImage) {
    throw new ApiError(500, "Something went wrong while uploading the new cover image in cloudinary")
  }

  const updateaUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: {
          url: newCoverImage.url,
          publicId: newCoverImage.public_id
        }
      }
    }
  ).select("-password")

  if (!updateaUser) {
    throw new ApiError(500, "Something went wrong while updating the cover image")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updateaUser },
        "Cover image updated successfully"
      )
    )
})

const deleteUser = asyncHandler(async (req, res) => {
  await deleteFromCloudinary(req.user?.avatar?.public_id)
  await deleteFromCloudinary(req.user?.coverImage?.public_id)

  const deletedUser = await User.findByIdAndDelete(req.user?._id)

  if (!deletedUser) {
    throw new ApiError(500, "Something went wrong while deleting the user")
  }

  const viewsOfTheDeletedUser = await View.deleteMany({ owner: req.user?._id })

  if (!viewsOfTheDeletedUser) {
    throw new ApiError(500, "Something went wrong while deleteing views of the video")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "User deleted successfully"
      )
    )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing")
  }

  const pipeline = [
    {
      $match: { username: username.trim().toLowerCase() }
    },
    {
      $lookup: {
        from: "subscriptions",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$subscriber", "$$userId"] }
            }
          },
          {
            $count: "count"
          }
        ],
        as: "subscribesCount"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$channel", "$$userId"] }
            }
          },
          {
            $count: "count"
          }
        ],
        as: "subscribersCount"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$channel", "$$userId"] },
                  { $eq: ["$subscriber", req.user?._id] }
                ]
              }
            }
          }
        ],
        as: "userSubscriptions"
      }
    },
    {
      $project: {
        email: 1,
        username: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,
        subscribesCount: {
          $ifNull: [{ $first: "$subscribesCount.count" }, 0]
        },
        subscribersCount: {
          $ifNull: [{ $first: "$subscribersCount.count" }, 0]
        },
        isSubscribed: {
          $cond: {
            if: { $gt: [{ $size: "$userSubscriptions" }, 0] },
            then: true,
            else: false
          }
        }
      }
    }
  ]

  const channelProfiles = await User.aggregate(pipeline)

  if (!channelProfiles &&  !channelProfiles.length) {
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
  getUserChannelProfile
}