import mongoose from "mongoose"
import { View } from "../models/view.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

const getVideos = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    query,
    channelId,
    sortBy = "createdAt",
    sortType = "dec"
  } = req.query

  const pipeline = []

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    customLabels: {
      docs: "videoList",
      totalDocs: "totalVideos"
    }
  }

  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      }
    })
  }

  if (channelId) {
    pipeline.push({
      $match: {
        publisher: new mongoose.Types.ObjectId(String(channelId))
      }
    })
  }

  pipeline.push({
    $sort: {
      [sortBy]: sortType === "inc" ? 1 : -1
    }
  })

  const videos = await Video.aggregatePaginate(
    Video.aggregate(pipeline),
    options
  )

  if (!videos || !videos.videoList) {
    throw new ApiError(500, "Something went wrong while fetching all videos")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videos,
        "Videos fetched successfully"
      )
    )
})

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body

  if (!title || !description) {
    throw new ApiError(400, "Title and Description both are required")
  }

  // error
  const videoLocalPath = (req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) ? req.files.videoFile[0].path : null

  const thumbnailLocalPath = (req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) ? req.files.videoFile[0].path : null

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video and Thumbnail both are required")
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath)
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

  if (!videoFile || !thumbnail) {
    throw new ApiError(500, "Something went wrong while uploading video and thumbnail in cloudinary")
  }

  const video = await Video.create({
    videoFile: {
      url: videoFile.url,
      publicId: videoFile.public_id
    },
    thumbnail: {
      url: thumbnail.url,
      publicId: thumbnail.public_id
    },
    duration: videoFile.duration,
    publisher: req.user?._id,
    title,
    description
  })

  if (!video) {
    throw new ApiError(500, "Something went wrong while uploading the video")
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { video },
        "Video uploaded successfully"
      )
    )
})

const getVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params

  if (!videoId) {
    throw new ApiError(400, "Video ID is required")
  }

  const video = await Video.findById(videoId)

  if (!video) {
    throw new ApiError(500, "Something went wrong while fetching the video")
  }

  const view = await View({
    video: video._id,
    owner: video.publisher,
    viwer: req.user?._id
  })

  if (!view) {
    throw new ApiError(500, "Something went wrong while creating view of this video")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { video },
        "User fetched successfully"
      )
    )

})

const changeVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const videoLocalPath = req.file?.path

  if (!videoId) {
    throw new ApiError(400, "Video ID is required")
  }

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is missing")
  }

  const oldVideo = await Video.findById(videoId)

  if (!oldVideo) {
    throw new ApiError(500, "Something went wrong while fetching the old video")
  }

  const oldVideoFile = await deleteFromCloudinary(oldVideo.videoFile.publicId)

  if (!oldVideoFile) {
    throw new ApiError(500, "Something went wrong while deleting the old video file from cloudinary")
  }

  const newVideoFile = await uploadOnCloudinary(videoLocalPath)

  if (!newVideoFile) {
    throw new ApiError(500, "Something went wrong while uploading the new video file in cloudinary")
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        videoFile: {
          url: newVideoFile.url,
          publicId: newVideoFile.public_id
        }
      }
    },
    { new: true }
  )

  if (!updatedVideo) {
    throw new ApiError(500, "Something went wrong while updating the video file")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updatedVideo },
        "Video file updated successfully"
      )
    )

})

const changeThumbnail = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const thumbnailLocalPath = req.file?.path

  if (!videoId) {
    throw new ApiError(400, "Video ID is required")
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is missing")
  }

  const oldVideo = await Video.findById(videoId)

  if (!oldVideo) {
    throw new ApiError(500, "Something went wrong while fetching the old video")
  }

  const oldThumbnail = await deleteFromCloudinary(oldVideo.thumbnail.publicId)

  if (!oldThumbnail) {
    throw new ApiError(500, "Something went wrong while deleting the old thumbnail from cloudinary")
  }

  const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath)

  if (!newThumbnail) {
    throw new ApiError(500, "Something went wrong while uploading the new thumbnail in cloudinary")
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        thumbnail: {
          url: newThumbnail.url,
          publicId: newThumbnail.public_id
        }
      }
    },
    { new: true }
  )

  if (!updatedVideo) {
    throw new ApiError(500, "Something went wrong while updating the thumbnail")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updatedVideo },
        "Thumbnail updated successfully"
      )
    )
})

const changeTitle = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const { title } = req.body

  if (!videoId) {
    throw new ApiError(400, "Video ID is required")
  }

  if (!title) {
    throw new ApiError(400, "Title is missing")
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: { title } },
    { new: true }
  )

  if (!updatedVideo) {
    throw new ApiError(500, "Something went wrong while updating the video title")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updatedVideo },
        "Video title updated successfully"
      )
    )
})

const changeDescription = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const { description } = req.body

  if (!videoId) {
    throw new ApiError(400, "Video ID is required")
  }

  if (!description) {
    throw new ApiError(400, "description is missing")
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: { description } },
    { new: true }
  )

  if (!updatedVideo) {
    throw new ApiError(500, "Something went wrong while updating the video description")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updatedVideo },
        "Video description updated successfully"
      )
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params

  if (!videoId) {
    throw new ApiError(400, "Video ID is required")
  }

  const oldVideo = await Video.findByIdAndDelete(videoId)

  if (!oldVideo) {
    throw new ApiError(500, "Something went wrong while deleteing the video")
  }

  const viewsOfTheOldVideo = await View.deleteMany({ video: videoId })

  if (!viewsOfTheOldVideo) {
    throw new ApiError(500, "Something went wrong while deleteing views of the video")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Video deleted successfully"
      )
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params

  if (!videoId) {
    throw new ApiError(400, "Video ID is required")
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: { isPublished: { $not: "$isPublished" } } },
    { new: true }
  )

  if (!updatedVideo) {
    throw new ApiError(500, "Something went wrong while updating the video publish status")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Publish status toggled successfully"
      )
    )
})

export {
  getVideos,
  publishVideo,
  getVideo,
  changeVideo,
  changeThumbnail,
  changeTitle,
  changeDescription,
  deleteVideo,
  togglePublishStatus
}