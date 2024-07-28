import mongoose from "mongoose"
import { View } from "../models/view.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoViewers = asyncHandler(async (req, res) => {

})

const getWatchedVideos = asyncHandler(async (req, res) => {
  
})

export {
  getVideoViewers,
  getWatchedVideos
}