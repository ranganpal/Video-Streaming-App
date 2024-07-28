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
  const page = parseInt(req.query?.page) || 1
  const limit = parseInt(req.query?.limit) || 10
  
  const subscriptions = await Subscription.aggregatePaginate(
    Subscription.aggregate([
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
          as: "channelDetials"
        }
      },
      {
        $unwind: "$channelDetials"
      },
      {
        $project: {
          channelId: "$channelDetails._id",
          channelAvatar: "$channelDetails.avatar",
          channelFullname: "$channelDetails.fullname",
          channelUsername: "$channelDetails.fullname"
        }
      }
    ]),
    {
      page,
      limit,
      customLabels: {
        docs: 'subscribedChannels',
        totalDocs: 'totalChannels'
      }
    }
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
  const page = parseInt(req.query?.page) || 1
  const limit = parseInt(req.query?.limit) || 10

  const subscriptions = await Subscription.aggregatePaginate(
    Subscription.aggregate([
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
          as: "subscriberDetials"
        }
      },
      {
        $unwind: "$subscriberDetials"
      },
      {
        $project: {
          subscriberId: "$subscriberDetials._id",
          subscriberAvatar: "$subscriberDetials.avatar",
          subscriberFullname: "$subscriberDetials.fullname",
          subscriberUsername: "$subscriberDetials.fullname"
        }
      }
    ]),
    {
      page,
      limit,
      customLabels: {
        docs: 'channelSubscribers',
        totalDocs: 'totalSubscribers'
      }
    }
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