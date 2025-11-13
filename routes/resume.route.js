import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { handleValidationErrors } from "../middlewares/error.validator.js";
import { createResumeValidation, updateResumeValidation } from "../middlewares/validators/resume.validator.js";
import { createResume, deleteResume, getResume, getResumes, updateResume } from "../controllers/resume.controller.js";


const resumeRouter = Router();

resumeRouter.get("/", getResumes);
resumeRouter.get("/:resumeId", getResume);
resumeRouter.post("/", authMiddleware, createResumeValidation, handleValidationErrors, createResume);
resumeRouter.put("/:resumeId", authMiddleware, updateResumeValidation, handleValidationErrors, updateResume);
resumeRouter.delete("/:resumeId", authMiddleware, deleteResume);

export default resumeRouter;