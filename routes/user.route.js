import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/error.validator.js";
import { validateUserUpdate } from "../middlewares/validators/user.validator.js"
import fileUpload from "../config/file-multer.js";
import { getUsers, getUsersCount, getUser, updateUser, deleteUser, getUserProfile, updateUserProfile } from "../controllers/user.controller.js";

const userRouter = Router();

// Публичные маршруты
userRouter.get("/", getUsers);
userRouter.get("/count", getUsersCount); //+
userRouter.get("/:userId", getUser);

// Защищенные маршруты (требуют аутентификации)
userRouter.get("/profile/me", authMiddleware, getUserProfile); //+
userRouter.patch("/profile/me", authMiddleware, fileUpload.array("achievementFiles", 10), validateUserUpdate, handleValidationErrors, updateUserProfile); //+
userRouter.put("/:userId", authMiddleware, updateUser);
userRouter.delete("/:userId", authMiddleware, deleteUser); //+

export default userRouter;
