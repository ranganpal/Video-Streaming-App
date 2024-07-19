import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
  toggleSubscription,
  getSubscribedChannels,
  getUserChannelSubscribers,
} from "../controllers/subscription.controller.js"

const router = Router()
router.use(verifyJWT)

router.route("/c/:channelId").post(toggleSubscription)
router.route("/c/:channelId").get(getSubscribedChannels)
router.route("/s/:subscriberId").get(getUserChannelSubscribers)

export default router