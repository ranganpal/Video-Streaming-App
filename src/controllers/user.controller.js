import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const registerUser = asyncHandler(async (req, res) => {
  // taking user data from frontend
  const { username, email, fullname, password } = req.body


  // empty field checking
  const emptyField = [username, email, fullname, password].some(
    field => field?.trim() === ""
  )

  if (emptyField) {
    throw new ApiError(400, "All fields are required")
  }


  // user existance checking
  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists")
  }


  // image uplaod
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


  // user creation
  const newUser = await User.create({
    email,
    fullname,
    password,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || ""
  })

  const sameUser = await User
    .findById(newUser._id)
    .select("-password -refreshToken")

  if (!sameUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  // returning response
  return res.status(201).json(
    new ApiResponse(200, sameUser, "User registered successfully")
  )
})


export { registerUser }