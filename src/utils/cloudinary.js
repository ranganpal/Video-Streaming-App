import fs from "fs"
import { ApiError } from "./apiError.js"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    })

    fs.unlinkSync(localFilePath)
    return response
  }
  catch (error) {
    fs.unlinkSync(localFilePath)
    throw new ApiError(500, error.message || "Failed to upload file on Cloudinary")
  }
}

export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null
    
    const response = await cloudinary.uploader.destroy(publicId)
    return response
  }
  catch (error) {
    throw new ApiError(500, error.message || "Failed to delete file from Cloudinary")
  }
}
