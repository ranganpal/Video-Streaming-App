import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    
    user.refreshToken = refreshToken
    user.save({ validateBeforeSave: false })
    
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
    avatar: avatar.url,
    coverImage: coverImage?.url || ""
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
  console.log('Body:', req.body);


  if (!username && !email) {
    throw new ApiError(400, "username or email is required")
  }

  const user = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (!user) {
    throw new ApiError(404, "User does not exist")
  }


  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
  }


  const loggedinUser = user.removeFields(["password", "refreshToken"])

  if (!loggedinUser) {
    throw new ApiError(500, "Something went wrong while logging in the user")
  }


  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

  const options = {
    httpOnly: true,
    secure: true
  }


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
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

export {
  registerUser,
  loginUser,
  logoutUser,
}