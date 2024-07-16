import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
  loginUser,
  logoutUser,
  registerUser,
  regenerateTokens,
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
router.route("/regenerate-tokens").post(regenerateTokens)

// secured routes
router.route("/logout").post(verifyJWT, logoutUser)

export default router