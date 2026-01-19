import express from "express";
import upload from "../middleware/upload";
import { deleteQuestion, getQuestions, uploadQuestions,downloadQuestions } from "../controllers/questionController";

const router = express.Router();

router.post("/upload", upload.single("file"), uploadQuestions);
router.get("/download", downloadQuestions);
router.get("/:brandId/:locale?", getQuestions);
router.delete("/:brandId", deleteQuestion);

export default router;
