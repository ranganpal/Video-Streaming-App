import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
  getVideoViewers,
  getWatchedVideos,
  updateWatchHistory
} from "../controllers/view.controller.js"

const router = Router()
router.use(verifyJWT)

router.route("/video-viewers").get(getVideoViewers)
router.route("/watched-videos").get(getWatchedVideos)
router.route("/remove-from-histroy/:videoId").patch(updateWatchHistory)

export default router