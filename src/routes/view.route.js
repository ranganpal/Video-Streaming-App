import { Router } from "express"
import { verifyJWT, verifyVideoOwnership } from "../middlewares/auth.middleware.js"
import {
  getVideoViewers,
  getWatchedVideos,
  updateWatchHistory
} from "../controllers/view.controller.js"

const router = Router()
router.use(verifyJWT)

router.route("/watched-videos").get(getWatchedVideos)
router.route("/video-viewers").get(
  verifyVideoOwnership,
  getVideoViewers
)
router.route("/remove-from-histroy/:videoId").patch(
  verifyVideoOwnership,
  updateWatchHistory
)

export default router