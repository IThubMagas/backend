import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/error.validator.js";
import { createResumeValidation, updateResumeValidation } from "../middlewares/validators/resume.validator.js";
import { createResume, deleteResume, getResume, getResumes, getResumesCount, updateResume } from "../controllers/resume.controller.js";


const userRouter = Router();

userRouter.get("/", getUsers);
userRouter.get("/count", getUsersCount);
userRouter.get("/:userId", getUser);
userRouter.put("/:userId", authMiddleware, updateResumeValidation, handleValidationErrors, updateUser);
userRouter.delete("/:userId", authMiddleware, deleteUser);

export default userRouter;