import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
  toggleSubscription,
  getSubscribedChannels,
  getChannelSubscribers
} from "../controllers/subscription.controller.js"

const router = Router()
router.use(verifyJWT)

router.route("/c/:channelId").post(toggleSubscription)
router.route("/subscribes").get(getSubscribedChannels)
router.route("/subscribers").get(getChannelSubscribers)

export default router