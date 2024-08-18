import mongoose, { isValidObjectId } from "mongoose"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Subscription } from "../models/subscription.model.js"


const toggleSubscription = asyncHandler(async (req, res) => {
  const channelId = req.params?.channelId
  const subscriberId = req.user?._id

  if (!channelId || !subscriberId) {
    throw new ApiError(400, "Channel ID or Subscriber ID is missing")
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const oldSubscription = await Subscription.findOneAndDelete(
    {
      subscriber: subscriberId,
      channel: channelId
    }
  )

  if (!oldSubscription) {
    const newSubscription = await Subscription.create(
      {
        subscriber: subscriberId,
        channel: channelId
      }
    )

    if (!newSubscription) {
      throw new ApiError(500, "Failed to create new subscription");
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        `${!oldSubscription ? "Subscribed" : "Unsubscribed"}`
      )
    )
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { page, limit, query, sortBy, sortType } = req.query  

  const pipeline = [
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(String(req.user?._id))
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelDetails"
      }
    },
    {
      $unwind: "$channelDetails"
    },
    {
      $project: {
        createdAt: 1,
        updatedAt: 1,
        channelId: "$channelDetails._id",
        channelAvatar: "$channelDetails.avatar.url",
        channelUsername: "$channelDetails.username",
        channelFullname: "$channelDetails.fullname"
      }
    }
  ]

  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { channelUsername: { $regex: query, $options: 'i' } },
          { channelFullname: { $regex: query, $options: 'i' } }
        ]
      }
    })
  }

  pipeline.push({
    $sort: {
      [sortBy || "createdAt"]: sortType === "inc" ? 1 : -1
    }
  })

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    customLabels: {
      docs: "subscribedChannels",
      totalDocs: "totalChannels"
    }
  }

  const subscriptions = await Subscription.aggregatePaginate(
    Subscription.aggregate(pipeline),
    options
  )

  if (!subscriptions || !subscriptions.subscribedChannels) {
    throw new ApiError(404, "No subscribed channels found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptions,
        "Successfully fetched subscribed channels"
      )
    )
})

const getChannelSubscribers = asyncHandler(async (req, res) => {
  const { page, limit, query, sortBy, sortType } = req.query

  const pipeline = [
    {
      $match: {
        channel: new mongoose.Types.ObjectId(String(req.user?._id))
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails"
      }
    },
    {
      $unwind: "$subscriberDetails"
    },
    {
      $project: {
        createdAt: 1,
        updatedAt: 1,
        subscriberId: "$subscriberDetails._id",
        subscriberAvatar: "$subscriberDetails.avatar.url",
        subscriberUsername: "$subscriberDetails.username",
        subscriberFullname: "$subscriberDetails.fullname"
      }
    }
  ]

  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { subscriberUsername: { $regex: query, $options: 'i' } },
          { subscriberFullname: { $regex: query, $options: 'i' } }
        ]
      }
    })
  }

  pipeline.push({
    $sort: {
      [sortBy || "createdAt"]: sortType === "inc" ? 1 : -1
    }
  })

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    customLabels: {
      docs: "channelSubscribers",
      totalDocs: "totalSubscribers"
    }
  }

  const subscriptions = await Subscription.aggregatePaginate(
    Subscription.aggregate(pipeline),
    options
  )

  if (!subscriptions || !subscriptions.channelSubscribers) {
    throw new ApiError(404, "No channel subscribers found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriptions,
        "Successfully fetched channel subscribers"
      )
    )
})

export {
  toggleSubscription,
  getSubscribedChannels,
  getChannelSubscribers
}