import { Router } from 'express';
import {
  getVideos,
  publishVideo,
  getVideo,
  changeVideoFile,
  changeThumbnail,
  changeTitle,
  changeDescription,
  deleteVideo,
  togglePublishStatus
} from "../controllers/video.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT, verifyVideoOwnership } from "../middlewares/auth.middleware.js"

const router = Router()
router.use(verifyJWT)

router
  .route("/")
  .get(getVideos)
  .post(
    upload.fields([
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      }
    ]),
    publishVideo
  )

router.route("/:videoId").get(getVideo)

router.route("/update-video-file/:videoId").patch(
  verifyVideoOwnership,
  upload.single("videoFile"),
  changeVideoFile
)
router.route("/update-thumbnail/:videoId").patch(
  verifyVideoOwnership,
  upload.single("thumbnail"),
  changeThumbnail
)
router.route("/update-title/:videoId").patch(
  verifyVideoOwnership,
  changeTitle
)
router.route("/update-description/:videoId").patch(
  verifyVideoOwnership, 
  changeDescription
)
router.route("/toggle-publish-status/:videoId").patch(
  verifyVideoOwnership, 
  togglePublishStatus
)
router.route("/:videoId").delete(
  verifyVideoOwnership, 
  deleteVideo
)

export default router