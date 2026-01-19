import { Request, Response } from "express";
import Question from "../models/questionModel";
import { validateBrandId } from "../utils/validateBrandId";
import { validateLocale } from "../utils/validateLocale";
import { successResponse, errorResponse } from "../utils/responseWrapper";
import { sendLogToNewRelic } from "../utils/newRelicLogger";

// GET /preferences/:brandId/:locale
export const getPreferences = async (req: Request, res: Response) => {
  try {
    const { brandId, locale } = req.params;
    
    // Validate parameters
    if (!brandId) return res.status(400).json(errorResponse("Brand ID is required"));
    if (!locale) return res.status(400).json(errorResponse("Locale is required"));
    if (!(await validateBrandId(brandId))) return res.status(400).json(errorResponse("Invalid brandId"));
    if (!(await validateLocale(locale))) return res.status(400).json(errorResponse("Invalid Locale"));

    // Check if locale exists for brand
    const localeExists = await Question.exists({ brandId, locale: locale });
    if (!localeExists) return res.status(404).json(errorResponse("Locale not found for brand"));

    // Get preferences
    const preferences = await Question.find({ 
      brandId, 
      locale: locale 
    }).select("-_id -__v");

    if (!preferences.length) {
      return res.status(400).json(errorResponse("No preferences found"));
    }

    /********************************* NewRelic Log Capture :: starts ************************************/ 
            const logs = [
              {
                message: 'User is able to get preferences successfully.',
                timestamp: Date.now(),
                logtype: 'INFO',
                service: 'app-pref',
                preferencesData: preferences
              } 
            ];
            sendLogToNewRelic(logs);  
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(200).json(successResponse("Preferences retrieved", preferences));
  } catch (error: any) {
    console.error("Error fetching preferences:", error);
    
    /********************************* NewRelic Log Capture :: starts ************************************/ 
    const logs = [
      {
        message: 'User is not able to fetch preferences',
        timestamp: Date.now(),
        logtype: 'INFO',
        service: 'app-pref',
        errorCode: 500
      } 
    ];
    sendLogToNewRelic(logs);  
/********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(500).json(errorResponse("Server error", 500));
  }
};

// POST /preferences/:brandId/:questionId/:locale
export const createPreference = async (req: Request, res: Response) => {
  try {
    const { brandId, questionId, locale, ...preferenceData } = req.body;

    // Consolidated validation
    if (!brandId && !questionId && !locale) {
      return res.status(400).json(errorResponse("Brand ID, Question ID, and Locale are all required"));
    }

    // Individual validation
    const errors: string[] = [];
    if (!brandId) errors.push("Brand ID");
    if (!questionId) errors.push("Question ID");
    if (!locale) errors.push("Locale");

    if (errors.length > 0) {
      return res.status(400).json(errorResponse(`Missing required fields: ${errors.join(', ')}`));
    }

    // Additional validation
    if (!(await validateBrandId(brandId))) return res.status(400).json(errorResponse("Invalid brandId"));
    if (!(await validateLocale(locale))) return res.status(400).json(errorResponse("Invalid Locale"));

    // Create preference
    const preference = await Question.findOneAndUpdate(
      { brandId, questionId, locale },
      { ...preferenceData, brandId, questionId, locale },
      { upsert: true, new: true, runValidators: true }
    );
  /********************************* NewRelic Log Capture :: starts ************************************/ 
       const logs = [
        {
          message: 'User is able to create preferences successfully.',
          timestamp: Date.now(),
          logtype: 'INFO',
          service: 'app-pref',
          createPreferencesData: preference
        } 
      ];
      sendLogToNewRelic(logs);  
  /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(201).json(successResponse("Preference created successfully", preference));
  } catch (error: any) {
    console.error("Error creating preference:", error);
      /********************************* NewRelic Log Capture :: starts ************************************/ 
      const logs = [
        {
          message: 'User is unable to create preferences',
          timestamp: Date.now(),
          logtype: 'INFO',
          service: 'app-pref',
          errorCode: 500,
          errorMessage: error.message
        } 
      ];
      sendLogToNewRelic(logs);  
  /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(500).json(errorResponse("Error creating preference", 500, error.message));
  }
};

// PUT /preferences/:brandId/:questionId/:locale
export const updatePreference = async (req: Request, res: Response) => {
  try {
    const { brandId, questionId, locale, ...updateData } = req.body;

    // Consolidated validation
    if (!brandId && !questionId && !locale) {
      return res.status(400).json(errorResponse("Brand ID, Question ID, and Locale are all required"));
    }

    // Individual validation
    const errors: string[] = [];
    if (!brandId) errors.push("Brand ID");
    if (!questionId) errors.push("Question ID");
    if (!locale) errors.push("Locale");

    if (errors.length > 0) {
      return res.status(400).json(errorResponse(`Missing required fields: ${errors.join(', ')}`));
    }

    // Additional validation
    if (!(await validateBrandId(brandId))) return res.status(400).json(errorResponse("Invalid brandId"));
    if (!(await validateLocale(locale))) return res.status(400).json(errorResponse("Invalid Locale"));

    // Update preference
    const updatedPreference = await Question.findOneAndUpdate(
      { brandId, questionId, locale },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedPreference) {
      return res.status(404).json(errorResponse("Preference not found"));
    }
  /********************************* NewRelic Log Capture :: starts ************************************/ 
      const logs = [
        {
          message: 'User is able to update preferences successfully.',
          timestamp: Date.now(),
          logtype: 'INFO',
          service: 'app-pref',
          updatedPreferenceData: updatedPreference
        } 
      ];
      sendLogToNewRelic(logs);  
  /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(200).json(successResponse("Preference updated successfully", updatedPreference));
  } catch (error: any) {
    console.error("Error updating preference:", error);
      /********************************* NewRelic Log Capture :: starts ************************************/ 
      const logs = [
        {
          message: 'User is not able to update preferences',
          timestamp: Date.now(),
          logtype: 'INFO',
          service: 'app-pref',
          errorCode: 500,
          errorMessage: error.message
        } 
      ];
      sendLogToNewRelic(logs);  
  /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(500).json(errorResponse("Error updating preference", 500, error.message));
  }
};

// DELETE /preferences/:brandId/:locale
export const deletePreference = async (req: Request, res: Response) => {
  try {
    const { brandId, locale } = req.params;

    // Validate parameters
    if (!brandId) return res.status(400).json(errorResponse("Brand ID is required"));
    if (!locale) return res.status(400).json(errorResponse("Locale is required"));
    if (!(await validateBrandId(brandId))) return res.status(400).json(errorResponse("Invalid brandId"));
    if (!(await validateLocale(locale))) return res.status(400).json(errorResponse("Invalid Locale"));

    // Delete preference
    const deletedPreference = await Question.findOneAndDelete({ 
      brandId, 
      locale: locale 
    });

    if (!deletedPreference) {
      return res.status(400).json(errorResponse("Preference not found"));
    }
      /********************************* NewRelic Log Capture :: starts ************************************/ 
      const logs = [
        {
          message: 'User is able to delete preferences successfully.',
          timestamp: Date.now(),
          logtype: 'INFO',
          service: 'app-pref',
          deletedPreferenceData: deletedPreference
        } 
      ];
      sendLogToNewRelic(logs);  
  /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(200).json(successResponse("Preference deleted", deletedPreference));
  } catch (error: any) {
    console.error("Error deleting preference:", error);
         /********************************* NewRelic Log Capture :: starts ************************************/ 
         const logs = [
          {
            message: 'User is unable to delete preferences',
            timestamp: Date.now(),
            logtype: 'INFO',
            service: 'app-pref',
            errorCode: 500
          } 
        ];
        sendLogToNewRelic(logs);  
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res.status(500).json(errorResponse("Server error", 500));
  }
};