import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body
  console.log("email: ", email)


  // empty field checking
  const emptyField = [username, email, fullname, password].some(
    field => field?.trim() === ""
  )
  if (emptyField) {
    throw new ApiError(400, "All fields are required")
  }


  // user existance checking
  const existingUser = User.findOne({
    $or: [{ username }, { email }]
  })
  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists")
  }


  // image uplaod
  const avatarLocalPath = req.file?.avatar[0]?.path
  const coverImageLocalPath = req.file?.coverImage[0]?.path

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required")
  }


  // user creation
  const user = await User.create({
    email,
    fullname,
    password,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || ""
  })

  const createdUser = await User
    .findById(user._id)
    .select("-password -refreshToken")

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }


  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
  )
})


export { registerUser }