import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
  registerUser,
  loginUser,
  logoutUser,
  regenerateTokens,
  getCurrentUser,
  changeEmail,
  changeFullname,
  changePassword,
  changeAvatar,
  changeCoverImage,
} from "../controllers/user.controller.js"

const router = Router()

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1
    },
    {
      name: "coverImage",
      maxCount: 1
    }
  ]),
  registerUser
)
router.route("/login").post(loginUser)
router.route("/regenerate-tokens").get(regenerateTokens)

// secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/current-user").get(verifyJWT, getCurrentUser)

router.route("/update-email").patch(verifyJWT, changeEmail)
router.route("/update-fullname").patch(verifyJWT, changeFullname)
router.route("/update-password").patch(verifyJWT, changePassword)

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), changeAvatar)
router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), changeCoverImage)

export default router