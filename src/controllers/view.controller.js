import mongoose from "mongoose"
import { View } from "../models/view.model.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoViewers = asyncHandler(async (req, res) => {
  const videoId = req.params.videoId
  const page = parseInt(req.query?.page) || 1
  const limit = parseInt(req.query?.limit) || 10

  if (!videoId) {
    throw new ApiError(404, "Video ID is missing")
  }

  const views = await View.aggregatePaginate(
    View.aggregate([
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
          viewerId: "$viewerDetails._id",
          viewerAvatar: "$viewerDetails.avatar",
          viewerUsername: "$viewerDetails.username",
          viewerFullname: "$viewerDetails.fullname",
        }
      }
    ]),
    {
      page,
      limit,
      customLabels: {
        docs: "videoViewers",
        totalDocs: "totalViewers"
      }
    }
  )

  if (!views || views.videoViewers) {
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
  const page = parseInt(req.query?.page) || 1
  const limit = parseInt(req.query?.limit) || 10

  const views = await View.aggregatePaginate(
    View.aggregate([
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
    ]),
    {
      page,
      limit,
      customLabels: {
        docs: "watchVideos",
        totalDocs: "totalVideos"
      }
    }
  )

  if (!views || views.watchedVideos) {
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
    {
      $set: { watchHistory: false }
    }
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