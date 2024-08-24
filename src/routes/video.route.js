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
import { verifyJWT } from "../middlewares/auth.middleware.js"

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
  );

router
  .route("/:videoId")
  .get(getVideo)
  .delete(deleteVideo)

router.route("/update-video-file/:videoId").patch(
  upload.single("videoFile"),
  changeVideoFile
)
router.route("/update-thumbnail/:videoId").patch(
  upload.single("thumbnail"),
  changeThumbnail
)
router.route("/update-title/:videoId").patch(changeTitle)
router.route("/update-description/:videoId").patch(changeDescription)
router.route("/toggle-publish-status/:videoId").patch(togglePublishStatus)

export default router