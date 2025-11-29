import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { validateUserUpdate } from "../middlewares/validators/user.validator.js"
import { handleValidationErrors } from "../middlewares/error.validator.js";
import userController from "../controllers/user.controller.js";

const userRouter = Router();

// Публичные маршруты
userRouter.get("/", userController.getUsers);
userRouter.get("/count", userController.getUsersCount);
userRouter.get("/:userId", userController.getUser);

// Защищенные маршруты (требуют аутентификации)
userRouter.get("/profile/me", authMiddleware, userController.getUserProfile);
userRouter.put("/profile/me", authMiddleware, validateUserUpdate, handleValidationErrors, userController.updateUserProfile);
userRouter.delete("/:userId", authMiddleware, userController.deleteUser);

export default userRouter;