import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
  getVideoViewers,
  getWatchedVideos
} from "../controllers/view.controller.js"

const router = Router()
router.use(verifyJWT)

/*

  getVideoViewers
  getWatchedVideos

*/

router.route("/video-viewers").get(getVideoViewers)
router.route("/watched-videos").get(getWatchedVideos)

export default router