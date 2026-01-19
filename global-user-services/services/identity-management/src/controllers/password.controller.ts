import { Request, Response } from "express";
import dotenv from "dotenv";
import axios from "axios";
import { handleApiError } from "../Utils/errorHandler";
import {
  getMarketIdByLanguage,
  validateBrandAndRegion,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  APP_IDS
} from "../Utils/shared";
import { errorResponse, successResponse } from "../Utils/responseWrapper";
import * as config from "../env";
import { getConfig } from "../services/config.service";
import { sendLogToNewRelic } from "../Utils/newRelicLogger";

// Base URL for API requests
const BASE_URL = config.baseURL ? `${config.baseURL}` : "";

export const changePassword = async (
  req: Request,
  res: Response
): Promise<any> => {
  const {
    currentPassword,
    newPassword,
    newPasswordConfirm,
    locale,
    redirect_uri,
    access_token,
    brandId,
    regionId,
  } = req.body;

  try {
    if (!currentPassword) {
      throw new Error("Input valid current password");
    }
    validatePassword(newPassword);
    validateConfirmPassword(newPassword, newPasswordConfirm);

    const brand = brandId.toUpperCase();
    const region = regionId.toUpperCase();
    const marketId = await getMarketIdByLanguage(locale);
    await validateBrandAndRegion({ brand, region });
    const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);

    const url = `${BASE_URL}/oauth/update_profile_native`;
    const body = {
      currentPassword,
      newPassword,
      newPasswordConfirm,
      access_token,
      client_id: configData.clientId,
      flow: configData.flow,
      flow_version: configData.flowVersion,
      form: "changePasswordForm",
      locale: locale,
      redirect_uri: redirect_uri,
    };

    const response = await axios.post(url, body);
    if (response.data?.stat === "error") {
      return res
        .status(400)
        .json(handleApiError({ response }, "Failed to change password.", 400));
    }
    /********************************* NewRelic Log Capture :: starts ************************************/
    const logs = [
      {
        message: "Password has been changed successfully.",
        timestamp: Date.now(),
        logtype: "INFO",
        service: "uup",
        endpoint: "changePassword",
        emailAddress: response.data,
      },
    ];
    sendLogToNewRelic(logs);
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res
      .status(200)
      .json(successResponse("Password changed successfully", response.data));
  } catch (error: any) {
    if (
      error.message === "Input valid current password" ||
      error.message.includes("Password must be at least 8 characters long") ||
      error.message === "Confirm password does not match"
    ) {
      const apiError = handleApiError({ error }, error.message, 400)
      return res
        .status(apiError.statusCode)
        .json(apiError);
    }
    /********************************* NewRelic Log Capture :: starts ************************************/
    const logs = [
      {
        message: "Password could not be successfully changed.",
        timestamp: Date.now(),
        logtype: "ERROR",
        service: "uup",
        endpoint: "changePassword",
        errorCode: 400,
      },
    ];
    sendLogToNewRelic(logs);
    /********************************* NewRelic Log Capture :: ends *************************************/
    const apiError = handleApiError({ error }, "Failed to change password.", 400)
    return res
      .status(apiError.statusCode)
      .json(apiError);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { email, locale, redirect_uri, brandId, regionId } = req.body;

  try {
    validateEmail(email);

    const brand = brandId.toUpperCase();
    const region = regionId.toUpperCase();
    const marketId = await getMarketIdByLanguage(locale);
    await validateBrandAndRegion({ brand, region });
    
     const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);

    const url = `${BASE_URL}/oauth/forgot_password_native`;
    const body = {
      signInEmailAddress: email,
      client_id: configData.clientId,
      flow: configData.flow,
      flow_version: configData.flowVersion,
      form: "forgotPasswordForm",
      locale: locale,
      redirect_uri: redirect_uri,
      response_type: "token",
    };

    const response = await axios.post(url, body);
    if (response.data?.stat === "error") {
      return res
        .status(400)
        .json(
          handleApiError(
            { response },
            "Failed to send password reset email.",
            400
          )
        );
    }
    /********************************* NewRelic Log Capture :: starts ************************************/
    const logs = [
      {
        message: "Password reset mail has been sent successfully.",
        timestamp: Date.now(),
        logtype: "INFO",
        service: "uup",
        endpoint: "resetPassword",
        emailAddress: response.data,
      },
    ];
    sendLogToNewRelic(logs);
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res
      .status(200)
      .json(
        successResponse("Password reset email sent successfully", response.data)
      );
  } catch (error) {
    /********************************* NewRelic Log Capture :: starts ************************************/
    const logs = [
      {
        message: "Password reset mail could not be sent.",
        timestamp: Date.now(),
        logtype: "ERROR",
        service: "uup",
        endpoint: "resetPassword",
        statusCode: 400,
      },
    ];
    sendLogToNewRelic(logs);
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res
      .status(400)
      .json(
        handleApiError({ error }, "Failed to send password reset email.", 400)
      );
  }
};

export const confirmResetPassword = async (
  req: Request,
  res: Response
): Promise<any> => {
  const {
    newPassword,
    newPasswordConfirm,
    locale,
    redirect_uri,
    brandId,
    regionId,
  } = req.body;

  try {
    validatePassword(newPassword);
    validateConfirmPassword(newPassword, newPasswordConfirm);

    const brand = brandId.toUpperCase();
    const region = regionId.toUpperCase();
    const marketId = await getMarketIdByLanguage(locale);
    await validateBrandAndRegion({ brand, region });
     const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);

    const url = `${BASE_URL}/oauth/update_profile_native`;
    const body = {
      ...req.body,
      client_id: configData.clientId,
      flow: configData.flow,
      flow_version: configData.flowVersion,
      form: "changePasswordFormNoAuth",
      locale: locale,
      redirect_uri: redirect_uri,
    };

    const response = await axios.post(url, body);
    if (response.data?.stat === "error") {
      /********************************* NewRelic Log Capture :: starts ************************************/
      const logs = [
        {
          message: "Password could not be reset successfully.",
          timestamp: Date.now(),
          logtype: "INFO",
          service: "uup",
          endpoint: "resetPassword",
          responseData: response.data,
        },
      ];
      sendLogToNewRelic(logs);
      /********************************* NewRelic Log Capture :: ends *************************************/

      return res
        .status(400)
        .json(handleApiError({ response }, "Failed to reset password.", 400));
    }
    /********************************* NewRelic Log Capture :: starts ************************************/
    const logs = [
      {
        message: "Password reset mail has been sent successfully.",
        timestamp: Date.now(),
        logtype: "INFO",
        service: "uup",
        endpoint: "resetPassword",
        responseData: response.data,
      },
    ];
    sendLogToNewRelic(logs);
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res
      .status(200)
      .json(successResponse("Password reset successfully", response.data));
  } catch (error: any) {
    if (
      error.message === "Confirm password does not match" ||
      error.message.includes("Password must be at least 8 characters long")
    ) {
      return res
        .status(400)
        .json(handleApiError({ error }, error.message, 400));
    }

    /********************************* NewRelic Log Capture :: starts ************************************/
    const logs = [
      {
        message: "Password could not be reset.",
        timestamp: Date.now(),
        logtype: "ERROR",
        service: "uup",
        endpoint: "resetPassword",
        responseData: 400,
      },
    ];
    sendLogToNewRelic(logs);
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res
      .status(400)
      .json(handleApiError({ error }, "Failed to reset password.", 400));
  }
};

export const validateToken = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { code, redirect_uri, brandId, regionId,locale } = req.body;

  if (!code) {
    return res.status(400).json(errorResponse("Code is required.", 400));
  }
 if (!locale) {
      return res.status(400).json({statusCode: "400",message:"missing arguments locale",errorCode: "missing_argument"});
    }
  try {
    const brand = brandId.toUpperCase();
    const region = regionId.toUpperCase();
    await validateBrandAndRegion({ brand, region });
    const marketId = await getMarketIdByLanguage(locale);
      const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);

    const url = `${BASE_URL}/oauth/token`;
    const params = {
      grant_type: "authorization_code",
      code: code,
      redirect_uri: configData.passwordResetURL,
    };
    const auth = {
      username: configData.clientId || "",
      password: configData.clientSecret || "",
    };

    const response = await axios.post(url, null, { params, auth });
    if (response.data?.stat === "error") {
      return res
        .status(400)
        .json(handleApiError({ response }, "Failed to validate token.", 400));
    }
    /********************************* NewRelic Log Capture :: starts ************************************/
    const logs = [
      {
        message: "Token has been validated successfully.",
        timestamp: Date.now(),
        logtype: "INFO",
        service: "uup",
        endpoint: "validateToken",
        responseData: response.data,
      },
    ];
    sendLogToNewRelic(logs);
    /********************************* NewRelic Log Capture :: ends *************************************/

    return res
      .status(200)
      .json(successResponse("Token validated successfully", response.data));
  } catch (error) {
    /********************************* NewRelic Log Capture :: starts ************************************/
    const logs = [
      {
        message: "Failed to validate token.",
        timestamp: Date.now(),
        logtype: "INFO",
        service: "uup",
        endpoint: "validateToken",
        responseData: 400,
      },
    ];
    sendLogToNewRelic(logs);
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res
      .status(400)
      .json(handleApiError({ error }, "Failed to validate token.", 400));
  }
};

export const getToken = async (req: Request, res: Response): Promise<any> => {
  const { code, redirect_uri, brandId, regionId,locale } = req.body;

  if (!code) {
    return res.status(400).json(errorResponse("Code is required.", 400));
  }
 if (!locale) {
      return res.status(400).json({statusCode: "400",message:"missing arguments locale",errorCode: "missing_argument"});
    }
  try {
    const brand = brandId.toUpperCase();
    const region = regionId.toUpperCase();
    await validateBrandAndRegion({ brand, region });
    const marketId = await getMarketIdByLanguage(locale);
      const configData = getConfig(`${APP_IDS.AIC}_${brand}_${region}_${marketId}_${locale}`);

    const url = `${BASE_URL}/oauth/token`;
    const params = {
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirect_uri,
    };
    const auth = {
      username: configData.clientId || "",
      password: configData.clientSecret || "",
    };

    const response = await axios.post(url, null, { params, auth });
    if (response.data?.stat === "error") {
      return res
        .status(400)
        .json(handleApiError({ response }, "Failed to validate token.", 400));
    }
    /********************************* NewRelic Log Capture :: starts ************************************/
    const logs = [
      {
        message: "Token validated csuccessfully.",
        timestamp: Date.now(),
        logtype: "INFO",
        service: "uup",
        endpoint: "validateToken",
        responseData: response.data,
      },
    ];
    sendLogToNewRelic(logs);
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res
      .status(200)
      .json(successResponse("Token validated successfully", response.data));
  } catch (error) {
    /********************************* NewRelic Log Capture :: starts ************************************/
    const logs = [
      {
        message: "Token could not be validated successfully.",
        timestamp: Date.now(),
        logtype: "INFO",
        service: "uup",
        endpoint: "validateToken",
        responseData: 400,
      },
    ];
    sendLogToNewRelic(logs);
    /********************************* NewRelic Log Capture :: ends *************************************/
    return res
      .status(400)
      .json(handleApiError({ error }, "Failed to validate token.", 400));
  }
};
