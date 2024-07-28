import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
  getVideoViewers,
  getWatchedVideos,
  updateWatchHistory
} from "../controllers/view.controller.js"

const router = Router()
router.use(verifyJWT)

/*

  getVideoViewers
  getWatchedVideos

*/

router.route("/watched-videos").get(getWatchedVideos)
router.route("/video-viewers/:videoId").get(getVideoViewers)
router.route("/remove-from-histroy/:videoId").patch(updateWatchHistory)

export default router