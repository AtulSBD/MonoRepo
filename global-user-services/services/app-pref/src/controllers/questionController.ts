import { Request, Response } from "express";
import Question from "../models/questionModel";
import { validateBrandId } from "../utils/validateBrandId";
import { validateLocale } from "../utils/validateLocale";
import { successResponse, errorResponse } from "../utils/responseWrapper";
import { sendLogToNewRelic } from "../utils/newRelicLogger";

export const getQuestions = async (req: Request, res: Response) => {
  try {
    const { brandId, locale } = req.params;
    // Validate brandId
    if (!brandId) {
      return res.status(400).json(errorResponse("Brand ID is required"));
    }
    if (!locale) {
      return res.status(400).json(errorResponse("Locale is required"));
    }
    if (!(await validateBrandId(brandId))) {
      return res.status(400).json(errorResponse("Invalid brandId"));
    }
    if (!(await validateLocale(locale))) {
      return res.status(400).json(errorResponse("Invalid Locale"));
    }
    if (locale) {
      const localeExists = await Question.exists({ brandId, locale: locale });
 
      if (!localeExists) {
        return res.status(404).json({statusCode:"404", message: "Locale not found for the given brandId" });
      }
    }
    let filter: any = { brandId };
    if (locale) {
      filter.locale = locale; // Apply locale filter if provided
    }

    const questions = await Question.find(filter).select("-_id");

    if (!questions.length) {
      return res.status(404).json(errorResponse("No questions found"));
    }
      /********************************* NewRelic Log Capture :: starts ************************************/ 
          const logs = [
            {
              message: 'User is able to retreive questions successfully.',
              timestamp: Date.now(),
              logtype: 'INFO',
              service: 'app-pref',
              questionsData: questions
            } 
          ];
          sendLogToNewRelic(logs);  
      /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(200).json(successResponse("Questions retrieved", questions));
  } catch (error: any) {
    console.error("Error fetching questions:", error);
     /********************************* NewRelic Log Capture :: starts ************************************/ 
     const logs = [
      {
        message: 'User is not able to retreive questions.',
        timestamp: Date.now(),
        logtype: 'ERROR',
        service: 'app-pref',
        errorMessage: error.message
      } 
    ];
    sendLogToNewRelic(logs);  
/********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(500).json(errorResponse("Error fetching questions", 500, error.message));
  }
};

export const uploadQuestions = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse("No file uploaded"));
    }

    const fileContent = req.file.buffer.toString("utf-8");
    const questions = JSON.parse(fileContent);

    // Validate brandId
    if (!questions.brandId) {
      return res.status(400).json(errorResponse("Brand ID is required"));
    }
    if (!questions.questionId) {
      return res.status(400).json(errorResponse("Question ID is required"));
    }
    if (!questions.locale) {
      return res.status(400).json(errorResponse("Locale is required"));
    }
    if (!(await validateBrandId(questions.brandId))) {
      return res.status(400).json(errorResponse("Invalid Brand ID"));
    }
    if (!(await validateLocale(questions.locale))) {
      return res.status(400).json(errorResponse("Invalid Locale"));
    }
    const savedQuestion = await Question.findOneAndUpdate(
      { brandId: questions.brandId, questionId: questions.questionId, locale: questions.locale },
      questions,
      { upsert: true, new: true }
    );
      /********************************* NewRelic Log Capture :: starts ************************************/ 
          const logs = [
            {
              message: 'User is able to upload questions successfully.',
              timestamp: Date.now(),
              logtype: 'INFO',
              service: 'app-pref',
              questionsData: savedQuestion
            } 
          ];
          sendLogToNewRelic(logs);  
      /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(200).json(successResponse("Questions uploaded successfully!", savedQuestion));
  } catch (error: any) {
    console.error("Error processing file:", error);
     /********************************* NewRelic Log Capture :: starts ************************************/ 
     const logs = [
      {
        message: 'User is not able to upload questions.',
        timestamp: Date.now(),
        logtype: 'ERROR',
        service: 'app-pref',
        errorMessage: error.message
      } 
    ];
    sendLogToNewRelic(logs);  
/********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(500).json(errorResponse("Error processing file", 500, error.message));
  }
};

export const downloadQuestions = async (req: Request, res: Response) => {
  try {
   
    const questions = await Question.find({}).select("-_id");

    if (!questions.length) {
      return res.status(404).json(errorResponse("No questions found"));
    }

    const jsonData = JSON.stringify(questions, null, 2);

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=all_questions.json`);
      /********************************* NewRelic Log Capture :: starts ************************************/ 
          const logs = [
            {
              message: 'User is able to download questions successfully.',
              timestamp: Date.now(),
              logtype: 'INFO',
              service: 'app-pref',
              questionsData: JSON.parse(jsonData).questionId, 
              answersData: JSON.parse(jsonData).answers 
            } 
          ];
          sendLogToNewRelic(logs);  
      /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(200).send(jsonData);
  } catch (error: any) {
    console.error("Error downloading all questions:", error);
     /********************************* NewRelic Log Capture :: starts ************************************/ 
     const logs = [
      {
        message: 'User is not able to download questions.',
        timestamp: Date.now(),
        logtype: 'ERROR',
        service: 'app-pref',
        errorMessage: error.message
      } 
    ];
    sendLogToNewRelic(logs);  
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(500).json(errorResponse("Error downloading all questions", 500, error.message));
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;

    // Validate brandId
    if (!brandId || !(await validateBrandId(brandId))) {
      return res.status(400).json(errorResponse("Invalid brandId"));
    }

    const deletedQuestion = await Question.findOneAndDelete({ brandId });

    if (!deletedQuestion) {
      return res.status(404).json(errorResponse("Question not found"));
    }
      /********************************* NewRelic Log Capture :: starts ************************************/ 
          const logs = [
            {
              message: 'User is able to delete questions successfully.',
              timestamp: Date.now(),
              logtype: 'INFO',
              service: 'app-pref',
              deletedQuestionsData: deletedQuestion
            } 
          ];
          sendLogToNewRelic(logs);  
      /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(200).json(successResponse("Question deleted successfully", deletedQuestion));
  } catch (error: any) {
    console.error("Error deleting question:", error);
    /********************************* NewRelic Log Capture :: starts ************************************/ 
    const logs = [
      {
        message: 'User is unable to delete questions',
        timestamp: Date.now(),
        logtype: 'ERROR',
        service: 'app-pref',
        errorMessage: error.message
      } 
    ];
    sendLogToNewRelic(logs);  
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(500).json(errorResponse("Error deleting question", 500, error.message));
  }
};