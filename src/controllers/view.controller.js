import mongoose from "mongoose"
import { View } from "../models/view.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoViewers = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    query,
    videoId,
    sortBy = "createdAt",
    sortType = "dec"
  } = req.query

  const pipeline = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(String(videoId))
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "viewer",
        foreignField: "_id",
        as: "viewerDetails"
      }
    },
    {
      $unwind: "$viewerDetails"
    },
    {
      $project: {
        createdAt: 1,
        updatedAt: 1,
        viewerId: "$viewerDetails._id",
        viewerAvatar: "$viewerDetails.avatar",
        viewerUsername: "$viewerDetails.username",
        viewerFullname: "$viewerDetails.fullname",
      }
    }
  ]

  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { viewerUsername: { $regex: query, $options: 'i' } },
          { viewerFullname: { $regex: query, $options: 'i' } }
        ]
      }
    })
  }

  pipeline.push({
    $sort: {
      [sortBy]: sortType === "inc" ? 1 : -1
    }
  })

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    customLabels: {
      docs: "videoViewers",
      totalDocs: "totalViewers"
    }
  }

  const views = await View.aggregatePaginate(
    View.aggregate(pipeline),
    options
  )

  if (!views || !views.videoViewers) {
    throw new ApiError(500, "Failed to fetch video viewers")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        views,
        "Successfully fetched video viewers"
      )
    )
})

const getWatchedVideos = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    query,
    sortBy = "createdAt",
    sortType = "dec"
  } = req.query

  const pipeline = [
    {
      $match: {
        viewer: new mongoose.Types.ObjectId(String(req.user?._id)),
        watchHistory: true
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        pipeline: [
          {
            $lookup: {
              from: "views",
              let: { videoId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$video", "$$videoId"] }
                  }
                },
                {
                  $count: "count"
                }
              ],
              as: "viewsCount"
            }
          },
          {
            $addFields: {
              viewsCount: { $first: "$viewsCount.count" }
            }
          }
        ],
        as: "videoDetails"
      }
    },
    {
      $unwind: "$videoDetails"
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails"
      }
    },
    {
      $unwind: "$ownerDetails"
    },
    {
      $project: {
        createdAt: 1,
        updatedAt: 1,
        videoId: videoDetails._id,
        videoTitle: videoDetails.title,
        videoDuration: videoDetails.duration,
        videoThumbnail: videoDetails.thumbnail,
        videoViews: videoDetails.viewsCount,
        ownerId: ownerDetails._id,
        ownerAvatar: ownerDetails.avatar,
        ownerUsername: ownerDetails.username,
        ownerFullname: ownerDetails.fullname
      }
    }
  ]

  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { videoTitle: { $regex: query, $options: 'i' } },
          { ownerUsername: { $regex: query, $options: 'i' } },
          { ownerFullname: { $regex: query, $options: 'i' } }
        ]
      }
    })
  }

  pipeline.push({
    $sort: {
      [sortBy]: sortType === "inc" ? 1 : -1
    }
  })

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    customLabels: {
      docs: "watchVideos",
      totalDocs: "totalVideos"
    }
  }

  const views = await View.aggregatePaginate(
    View.aggregate(pipeline),
    options
  )

  if (!views || !views.watchedVideos) {
    throw new ApiError(500, "Failed to fetch watched videos")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        views,
        "Successfully fetched watched videos"
      )
    )
})

const updateWatchHistory = asyncHandler(async (req, res) => {
  const videoId = req.params.videoId
  const userId = req.user._id

  if (!videoId || !userId) {
    throw new ApiError(404, "Video ID or User ID is missing")
  }

  const view = await View.findOneAndUpdate(
    {
      video: new mongoose.Types.ObjectId(String(videoId)),
      viewer: new mongoose.Types.ObjectId(String(userId))
    },
    { $set: { watchHistory: false } },
    { new: true }

  )

  if (!view) {
    throw new ApiError(500, "No view document was updated for the given video ID and User ID")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Successfully updated watch history"
      )
    )
})

export {
  getVideoViewers,
  getWatchedVideos,
  updateWatchHistory
}