jest.mock("../src/Utils/errorHandler", () => ({
  handleApiError: jest.fn((error, defaultMessage = "An unexpected error occurred", statusCode = 500) => ({
    statusCode: statusCode || 500,
    message: error?.message || defaultMessage,
    errorCode: error?.errorCode || error?.name || "ERROR",
    requestId: undefined,
    invalidFields: undefined
  }))
}));

import axios from "axios";
import request from "supertest";
import { Request, Response } from "express";
import express from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  verifyEmail,
  resendEmail,
  newsletterSignUp,
  changeEmailController,
  changeEmailSupportController,
} from "../src/controllers/auth.controller";
import * as authSupport from "../src/services/auth.service";
import * as lookupService from "../src/services/lookup.service";
import * as userMUUID from "../src/Utils/userMuuid";
import * as configService from "../src/services/config.service";
import * as shared from "../src/Utils/shared";
import * as changeEmailUtils from "../src/Utils/changeEmailUtil";
import { sendLogToNewRelic } from "../src/Utils/newRelicLogger";
import { handleApiError } from "../src/Utils/errorHandler";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;
const app = express();
app.use(express.json());
app.post("/register", register);
app.post("/login", login);
app.post("/logout", logout);
app.post("/refresh_token", refreshToken);
app.get("/verify_email", verifyEmail);
app.post("/resend_email", resendEmail);
app.post("/newsletter-signup", newsletterSignUp);
app.post("/change-email", changeEmailController);
app.post("/change-email-support", changeEmailSupportController);

jest.mock("../src/services/auth.service", () => ({
  registerWithAIC: jest.fn(),
  sendNonPIIData: jest.fn(),
  registerWithTD: jest.fn(),
  updateEmailVerifiedStatusToTD: jest.fn(),
  updateLastLoginStatusToTD: jest.fn(),
}));
jest.mock("../src/services/lookup.service", () => ({
  getMarket: jest.fn(),
  getBrand: jest.fn(),
  getRegion: jest.fn(),
}));
jest.mock("../src/Utils/userMuuid", () => ({
  getOrCreateMuuid: jest.fn(),
  getUserByUUID: jest.fn(),
  linkMuuidWithAggressiveDetails: jest.fn(),
  handleNewsletterSignup: jest.fn(),
  updateEmail: jest.fn(),
}));

jest.mock("../src/services/config.service", () => ({
  getConfig: jest.fn(),
}));

jest.mock("../src/Utils/shared", () => ({
  validateEmail: jest.fn(),
  validateRequiredField: jest.fn(),
  validateBrandAndRegion: jest.fn(),
  validatePassword: jest.fn(),
  validateConfirmPassword: jest.fn(),
  convertGraphQLErrorToPlainString: jest.fn(),
  getMarketIdByLanguage: jest.fn().mockResolvedValue("US"),
  getRegionIdValue: jest.fn(), 
  APP_IDS: { AIC: "AIC" },
}));

jest.mock("../src/Utils/changeEmailUtil", () => ({
  validateRequest: jest.fn(),
  validateRequestSupport: jest.fn(),
  getUserProfile: jest.fn(),
  getAccessTokenByUUID: jest.fn(),
  triggerEmailVerification: jest.fn(),
  updateEmailPref: jest.fn(),
}));
jest.mock("../src/Utils/newRelicLogger");
jest.mock("../src/Utils/errorHandler");

describe("AuthController (updated code)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.resetAllMocks();
  });

  // REGISTER
  describe("register", () => {
    it("should register a user successfully", async () => {
      (lookupService.getMarket as jest.Mock).mockResolvedValue({ isExits: true, data: { name: "USA" } });
      (shared.validateEmail as jest.Mock).mockImplementation(() => { });
      (shared.validateRequiredField as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => { });
      jest.mocked(userMUUID.getOrCreateMuuid).mockResolvedValue("mockMUUID");
      (authSupport.registerWithAIC as jest.Mock).mockImplementation((_data: any, callback: any) => {
        callback(null, { capture_user: { uuid: "test-uuid", created: "2024-06-01" } });
      });
      (authSupport.sendNonPIIData as jest.Mock).mockResolvedValue("success");
      (authSupport.registerWithTD as jest.Mock).mockResolvedValue("success");
      jest.mocked(sendLogToNewRelic).mockResolvedValue();
      (shared.getRegionIdValue as jest.Mock).mockResolvedValue(true);


      const response = await request(app)
        .post("/register")
        .send({
          emailAddress: "test25@example.com",
          newPassword: "Test@123",
          newPasswordConfirm: "Test@123",
          regionId: "NA",
          brandId: "CM",
          market: "US",
          givenName: "John",
          familyName: "Doe",
        });
      expect(response.status).toBe(201);
      expect(response.body.data).toEqual({ UserId: "test-uuid" });
    });

    it("should return 400 if market is invalid", async () => {
      (lookupService.getMarket as jest.Mock).mockResolvedValue(false);
      (shared.validateEmail as jest.Mock).mockImplementation(() => { });
      (shared.validateRequiredField as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => { });
      (handleApiError as jest.Mock).mockReturnValue({ statusCode: 400, message: "Invalid market Id. Pleasese provide a valid market ID" });

      const response = await request(app)
        .post("/register")
        .send({
          emailAddress: "test@example.com",
          newPassword: "Test@123",
          newPasswordConfirm: "Test@123",
          regionId: "NA",
          brandId: "CM",
          market: "INVALID",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid market Id. Pleasese provide a valid market ID");
    });

    it("should return error if registerWithAIC fails", async () => {
      (lookupService.getMarket as jest.Mock).mockResolvedValue({ isExits: true, data: { name: "USA" } });
      (shared.validateEmail as jest.Mock).mockImplementation(() => { });
      (shared.validateRequiredField as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => { });
      jest.mocked(userMUUID.getOrCreateMuuid).mockResolvedValue("mockMUUID");
      (authSupport.registerWithAIC as jest.Mock).mockImplementation((_data, callback) => {
        callback(new Error("AIC service error"), null);
      });
      (handleApiError as jest.Mock).mockReturnValue({ statusCode: 500, message: "AIC service error" });

      const response = await request(app)
        .post("/register")
        .send({
          emailAddress: "test@example.com",
          newPassword: "Test@123",
          newPasswordConfirm: "Test@123",
          regionId: "NA",
          brandId: "CM",
          market: "US",
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("AIC service error");
    });

    it("should return 400 if required fields are missing", async () => {
      (shared.validateRequiredField as jest.Mock).mockImplementation(() => {
        throw new Error("Missing required fields");
      });
      (handleApiError as jest.Mock).mockReturnValue({ statusCode: 400, message: "Missing required fields" });

      const response = await request(app)
        .post("/register")
        .send({
          emailAddress: "",
          newPassword: "",
          newPasswordConfirm: "",
          regionId: "NA",
          brandId: "CM",
          market: "US",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Missing required fields");
    });

    it("should return 400 if email is invalid", async () => {
      (shared.validateEmail as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid email format");
      });
      (handleApiError as jest.Mock).mockReturnValue({ statusCode: 400, message: "Invalid email format" });

      const response = await request(app)
        .post("/register")
        .send({
          emailAddress: "invalid-email",
          newPassword: "Test@123",
          newPasswordConfirm: "Test@123",
          regionId: "NA",
          brandId: "CM",
          market: "US",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid email format");
    });

    it("should return 400 if passwords do not match", async () => {
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => {
        throw new Error("Passwords do not match");
      });
      (handleApiError as jest.Mock).mockReturnValue({ statusCode: 400, message: "Passwords do not match" });

      const response = await request(app)
        .post("/register")
        .send({
          emailAddress: "test@example.com",
          newPassword: "Test@123",
          newPasswordConfirm: "Mismatch@123",
          regionId: "NA",
          brandId: "CM",
          market: "US",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Passwords do not match");
    });
  });

  // LOGIN
  describe("login", () => {
    it("should return 200 and success response on valid login", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          capture_user: { emailVerified: true, email: "test.user1@AllFreeMail.net" },
          access_token: "mockToken",
          authorization_code: "mockCode",
          uuid: "user-uuid",
          MUUID: "mockMUUID",
        },
      });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        baseURL: "http://mockapi.com",
        flow: "mockFlow",
        flowVersion: "v1",
      });
      jest.mocked(sendLogToNewRelic).mockResolvedValue();

      const response = await request(app)
        .post("/login")
        .send({
          locale: "en-US",
          redirect_uri: "http://localhost/",
          signInEmailAddress: "test.user1@AllFreeMail.net",
          signInPassword: "Pass@123",
          brandId: "CM",
          regionId: "NA",
          marketId: "US",
        });
      expect(response.status).toBe(200);
      expect(response.body.data.access_token).toBe("mockToken");
    });

    it("should return 202 if email is not verified", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          capture_user: { emailVerified: false },
        },
      });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        baseURL: "http://mockapi.com",
        flow: "mockFlow",
        flowVersion: "v1",
      });
      jest.mocked(sendLogToNewRelic).mockResolvedValue();

      const response = await request(app)
        .post("/login")
        .send({
          signInEmailAddress: "test.user2@example.com",
          signInPassword: "Pass@123",
          brandId: "CM",
          regionId: "NA",
          marketId: "US",
          locale: "en-US",
        });

      expect(response.status).toBe(202);
      expect(response.body.message).toBe("Email not verified");
    });

    it("should handle API error and return 400", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: "error", error: "invalid_credentials" },
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: "Login failed",
      });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        baseURL: "http://mockapi.com",
        flow: "mockFlow",
        flowVersion: "v1",
      });

      const response = await request(app)
        .post("/login")
        .send({
          signInEmailAddress: "wrong@example.com",
          signInPassword: "wrongpass",
          brandId: "CM",
          regionId: "NA",
          marketId: "US",
          locale: "en-US",
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Login failed");
    });

    it("should return 400 if brandId or regionId is missing", async () => {
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: "Please provide the brandId and regionId\n Note: Currently we supporting only DW, CM and ST brands",
        errorCode: "INVALID_INPUT",
      });
      jest.mocked(sendLogToNewRelic).mockResolvedValue();

      const response = await request(app)
        .post("/login")
        .send({
          signInEmailAddress: "test@example.com",
          signInPassword: "Pass@123",
          marketId: "US",
          locale: "en-US",
        });

      expect(response.status).toBe(400);
      expect(response.body.errorCode).toMatch("INVALID_INPUT");
      expect(response.body.message).toMatch("Please provide the brandId and regionId");
    });
  });

  // REFRESH TOKEN
  describe("refreshToken", () => {
    it("should return 400 if locale is missing", async () => {
      const response = await request(app)
        .post("/refresh_token")
        .query({
          refresh_token: "token",
          redirect_uri: "http://localhost/",
          brandId: "CM",
          regionId: "NA",
        });
      expect(response.status).toBe(400);
      expect(response.body.errorCode).toBe("missing_argument");
    });

    it("should return 200 and success response on valid refresh token", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: "ok", accessToken: "mockToken", redirect_uri: "http://localhost/" },
      });
      jest.mocked(sendLogToNewRelic).mockResolvedValue();
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        baseURL: "http://mockapi.com",
      });

      const response = await request(app)
        .post("/refresh_token")
        .query({
          refresh_token: "jr8jax3522p23b6upx4n",
          redirect_uri: "http://localhost/",
          brandId: "CM",
          regionId: "NA",
          locale: "en-US",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBe("mockToken");
    });

    it("should return 400 when API response has error status", async () => {
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: "invalid refresh token",
      });
      jest.mocked(sendLogToNewRelic).mockResolvedValue();
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        baseURL: "http://mockapi.com",
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: "error", message: "invalid refresh token" },
      });

      const response = await request(app)
        .post("/refresh_token")
        .query({
          refresh_token: "invalid_token",
          redirect_uri: "http://localhost/",
          brandId: "CM",
          regionId: "NA",
          locale: "en-US",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("invalid refresh token");
    });

    it("should return 400 when Axios throws an error", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("Network Error"));
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: "Network Error",
      });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: "mockClientId",
        clientSecret: "mockClientSecret",
        baseURL: "http://mockapi.com",
      });

      const response = await request(app)
        .post("/refresh_token")
        .query({
          refresh_token: "some_token",
          redirect_uri: "http://localhost/",
          brandId: "CM",
          regionId: "NA",
          locale: "en-US",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Network Error");
    });
  });

  // LOGOUT
  describe("logout", () => {
    const mockRequestBody = {
      userId: "user-124",
      brandId: "CM",
      regionId: "NA",
      locale: "en-US",
    };
    const mockConfigData = {
      ownerId: "owner-id",
      ownerSecret: "owner-secret",
      entity: "user_entity",
      baseURL: "http://mockapi.com",
    };

    it("should return 400 if userId is missing", async () => {
      const response = await request(app)
        .post("/logout")
        .send({ brandId: "CM", regionId: "NA", locale: "en-US" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User ID missing");
    });

    it("should return 400 if locale is missing", async () => {
      const response = await request(app)
        .post("/logout")
        .send({ userId: "user-123", brandId: "CM", regionId: "NA" });

      expect(response.status).toBe(400);
      expect(response.body.errorCode).toBe("missing_argument");
    });

    it("should return 200 on successful logout", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue(mockConfigData);
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: "ok", result: "logout-success" },
      });
      jest.mocked(sendLogToNewRelic).mockResolvedValue();

      const response = await request(app)
        .post("/logout")
        .send(mockRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Logout successful");
      expect(response.body.data.result).toBe("logout-success");
    });

    it("should return 400 on Invalid brand or region", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid brand or region");
      });
      (configService.getConfig as jest.Mock).mockReturnValue(mockConfigData);
      (handleApiError as jest.Mock).mockReturnValue({
        message: "Logout failed",
        statusCode: 400,
      });
      jest.mocked(sendLogToNewRelic).mockResolvedValue();

      const response = await request(app)
        .post("/logout")
        .send({ userId: "user-123", locale: "en-US" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Logout failed");
    });

    it("should return 400 if API response indicates error", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue(mockConfigData);
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: "error", message: "Logout failed" },
      });
      (handleApiError as jest.Mock).mockReturnValue({
        message: "Logout failed",
        statusCode: 400,
      });

      const response = await request(app)
        .post("/logout")
        .send(mockRequestBody);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Logout failed");
    });
  });

  // VERIFY EMAIL
  describe("verifyEmail", () => {
    it("should return 400 if verification_code is missing", async () => {
      const response = await request(app)
        .get("/verify_email")
        .query({ regionId: "NA" });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Code is required.");
    });

    it("should return 400 if regionId is missing", async () => {
      const response = await request(app)
        .get("/verify_email")
        .query({ verification_code: "12345" });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("region is required.");
    });

    // it("should verify email and return 200 on success", async () => {
    //   mockedAxios.post.mockResolvedValueOnce({
    //     data: { stat: "ok", uuid: "user-uuid", message: "Email verified successfully" },
    //   });
    //   (authSupport.updateEmailVerifiedStatusToTD as jest.Mock).mockResolvedValue("success");
    //   jest.mocked(sendLogToNewRelic).mockResolvedValue();

    //   const response = await request(app)
    //     .get("/verify_email")
    //     .query({ verification_code: "12345", regionId: "NA" });

    //   expect(response.status).toBe(200);
    //   expect(response.body.message).toBe("Email verified successfully");
    // });

    it("should handle email verification failure", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: "error", error: "email_verification_failed" },
      });
      (handleApiError as jest.Mock).mockReturnValue({ statusCode: 400, message: "Failed to verify email" });
      jest.mocked(sendLogToNewRelic).mockResolvedValue();

      const response = await request(app)
        .get("/verify_email")
        .query({ verification_code: "invalid", regionId: "NA" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("locale is required.");
    });
  });

  // RESEND EMAIL
  describe("resendEmail", () => {
    const validBody = {
      emailAddress: "user@example.com",
      locale: "en-US",
      redirect_uri: "http://localhost/",
      brandId: "CM",
      regionId: "NA",
    };

    it("should return 200 and success response on valid input", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: "ok", message: "Email sent" },
      });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: "mockClientId",
        flow: "mockFlow",
        flowVersion: "v1",
        ownerId: "ownerId",
        ownerSecret: "ownerSecret",
        baseURL: "http://mockapi.com",
      });

      const response = await request(app)
        .post("/resend_email")
        .send(validBody);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Verification code email resent successfully");
      expect(sendLogToNewRelic).toHaveBeenCalled();
    });

    it("should return 400 when email is invalid", async () => {
      (shared.validateEmail as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid email");
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: "Failed to resend email.",
      });

      const response = await request(app)
        .post("/resend_email")
        .send({ ...validBody, emailAddress: "invalid-email" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Failed to resend email.");
      expect(sendLogToNewRelic).toHaveBeenCalled();
    });

    it("should return 400 when brand/region validation fails", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid brand or region");
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: "Invalid brand or region",
      });
      const response = await request(app)
        .post("/resend_email")
        .send(validBody);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid brand or region");
      expect(sendLogToNewRelic).toHaveBeenCalled();
    });

    it("should return 202 when API responds with error code 540", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: "error", code: 540, message: "Already verified" },
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 202,
        message: "Failed to resend email.",
      });

      const response = await request(app)
        .post("/resend_email")
        .send(validBody);

      expect(response.status).toBe(202);
      expect(response.body.message).toBe("Failed to resend email.");
    });

    it("should return 400 when Axios throws an error", async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error("Network Error"));
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: "Failed to resend email.",
      });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: "mockClientId",
        flow: "mockFlow",
        flowVersion: "v1",
        ownerId: "ownerId",
        ownerSecret: "ownerSecret",
        baseURL: "http://mockapi.com",
      });

      const response = await request(app)
        .post("/resend_email")
        .send(validBody);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Failed to resend email.");
      expect(sendLogToNewRelic).toHaveBeenCalled();
    });
  });

  // NEWSLETTER SIGNUP
  describe("newsletterSignUp", () => {
    const mockRequestBody = {
      emailAddress: "test@example.com",
      brandId: "CM",
      regionId: "NA",
      market: "US",
      source: "website_newsletter_footer",
      tool_usage: "some_tool",
    };

   

    it("should return 201 on successful newsletter signup", async () => {
      (shared.validateEmail as jest.Mock).mockResolvedValue(true);
      (lookupService.getMarket as jest.Mock).mockResolvedValue({ isExits: true, data: { name: "USA" } });
      (shared.validateRequiredField as jest.Mock).mockResolvedValue(true);
      (shared.validateBrandAndRegion as jest.Mock).mockResolvedValue(true);
      jest.mocked(userMUUID.handleNewsletterSignup).mockResolvedValue("mock-muuid");
      (authSupport.sendNonPIIData as jest.Mock).mockResolvedValue({ data: "mock-user-id" });
      (authSupport.registerWithTD as jest.Mock).mockResolvedValue("success");
      jest.mocked(sendLogToNewRelic).mockResolvedValue();

      const response = await request(app)
        .post("/newsletter-signup")
        .send(mockRequestBody);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Newsletter signup successful");
      expect(response.body.data.userId).toBe("mock-user-id");
    });


    it("should return 400 for invalid email", async () => {
      (lookupService.getMarket as jest.Mock).mockResolvedValue({ isExits: true, data: { name: "USA" } });
      (shared.validateEmail as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid email");
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: "Invalid email",
      });

      const response = await request(app)
        .post("/newsletter-signup")
        .send({ ...mockRequestBody, emailAddress: "invalid-email" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Invalid email");
    });

    it("should return 400 for missing required fields", async () => {
      (shared.validateEmail as jest.Mock).mockImplementation(() => { });
      (lookupService.getMarket as jest.Mock).mockResolvedValue({ isExits: true, data: { name: "USA" } });
      (shared.validateRequiredField as jest.Mock).mockImplementation(() => {
        throw new Error("Missing required fields");
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: "Missing required fields",
      });

      const response = await request(app)
        .post("/newsletter-signup")
        .send({ emailAddress: "test@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Missing required fields");
    });

    it("should return 400 if sendNonPIIData returns error", async () => {
      (shared.validateEmail as jest.Mock).mockImplementation(() => { });
      (lookupService.getMarket as jest.Mock).mockResolvedValue({ isExits: true, data: { name: "USA" } });
      (shared.validateRequiredField as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (userMUUID.handleNewsletterSignup as jest.Mock).mockResolvedValue("mock-muuid");
      (authSupport.sendNonPIIData as jest.Mock).mockResolvedValue({
        errors: [{ message: "GraphQL error" }],
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: "Plain error",
      });

      const response = await request(app)
        .post("/newsletter-signup")
        .send(mockRequestBody);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Plain error");
    });

    it("should return appropriate error on unexpected exception", async () => {
      (lookupService.getMarket as jest.Mock).mockResolvedValue({ isExits: true, data: { name: "USA" } });
      (shared.validateEmail as jest.Mock).mockImplementation(() => {
        throw new Error("Unexpected error");
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 500,
        message: "Unexpected error",
      });

      const response = await request(app)
        .post("/newsletter-signup")
        .send(mockRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Unexpected error");
    });
  });

  // CHANGE EMAIL
  describe("changeEmailController", () => {
    const mockRequestBody = {
      currentEmail: "old@example.com",
      newEmail: "new@example.com",
      password: "securePassword",
      brandId: "CM",
      regionId: "NA",
      locale: "en-US",
      market: "US",
    };

    it("should return 200 on successful email change", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequest as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock)
        .mockResolvedValueOnce({ uuid: "uuid-123", MUUID: "muuid-456" }) // currentEmail
        .mockResolvedValueOnce(null); // newEmail not in use
      (changeEmailUtils.getAccessTokenByUUID as jest.Mock).mockResolvedValue("access-token");
      (changeEmailUtils.updateEmailPref as jest.Mock).mockResolvedValue({ market: "US" });
      (userMUUID.updateEmail as jest.Mock).mockResolvedValue(true);
      (changeEmailUtils.triggerEmailVerification as jest.Mock).mockResolvedValue(true);
      (authSupport.registerWithTD as jest.Mock).mockImplementation(() => { });
      jest.mocked(sendLogToNewRelic).mockResolvedValue();

      const response = await request(app)
        .post("/change-email")
        .send(mockRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Email change successful. Verification email has been sent");
    });

    it("should return 400 if request validation fails", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequest as jest.Mock).mockReturnValue("Validation error");

      const response = await request(app)
        .post("/change-email")
        .send(mockRequestBody);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation error");
    });

    it("should return 401 if current email or password is invalid", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequest as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/change-email")
        .send(mockRequestBody);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid current email or password.");
    });

    it("should return 409 if new email is already in use", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequest as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock)
        .mockResolvedValueOnce({ uuid: "uuid-123", MUUID: "muuid-456" }) // currentEmail
        .mockResolvedValueOnce({ uuid: "uuid-789" }); // newEmail already in use

      const response = await request(app)
        .post("/change-email")
        .send(mockRequestBody);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("New email is already in use.");
    });

    it("should return 500 if access token retrieval fails", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequest as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock)
        .mockResolvedValueOnce({ uuid: "uuid-123", MUUID: "muuid-456" })
        .mockResolvedValueOnce(null);
      (changeEmailUtils.getAccessTokenByUUID as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post("/change-email")
        .send(mockRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Failed to retrieve access token");
    });

    it("should return 500 if updateEmailPref fails", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequest as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock)
        .mockResolvedValueOnce({ uuid: "uuid-123", MUUID: "muuid-456" })
        .mockResolvedValueOnce(null);
      (changeEmailUtils.getAccessTokenByUUID as jest.Mock).mockResolvedValue("access-token");
      (changeEmailUtils.updateEmailPref as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post("/change-email")
        .send(mockRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Failed to update user Pref data");
    });

    it("should return 500 if email verification fails", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequest as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock)
        .mockResolvedValueOnce({ uuid: "uuid-123", MUUID: "muuid-456" })
        .mockResolvedValueOnce(null);
      (changeEmailUtils.getAccessTokenByUUID as jest.Mock).mockResolvedValue("access-token");
      (changeEmailUtils.updateEmailPref as jest.Mock).mockResolvedValue({ market: "US" });
      (userMUUID.updateEmail as jest.Mock).mockResolvedValue(true);
      (changeEmailUtils.triggerEmailVerification as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post("/change-email")
        .send(mockRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to trigger email verification.");
    });

    it("should return error response on unexpected exception", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {
        throw new Error("Unexpected error");
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 500,
        message: "Unexpected error",
      });

      const response = await request(app)
        .post("/change-email")
        .send(mockRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Unexpected error");
    });
  });

  // CHANGE EMAIL SUPPORT
  describe("changeEmailSupportController", () => {
    const mockRequestBody = {
      currentEmail: "old@example.com",
      newEmail: "new@example.com",
      brandId: "CM",
      regionId: "NA",
      locale: "en-US",
      isDuploUser: false,
      isPolarisUser: true,
    };

    it("should return 200 on successful email change", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequestSupport as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock)
        .mockResolvedValueOnce({ uuid: "uuid-123", MUUID: "muuid-456" }) // currentEmail
        .mockResolvedValueOnce(null); // newEmail not in use
      (changeEmailUtils.getAccessTokenByUUID as jest.Mock).mockResolvedValue("access-token");
      (changeEmailUtils.updateEmailPref as jest.Mock).mockResolvedValue({ market: "US" });
      (userMUUID.updateEmail as jest.Mock).mockResolvedValue(true);
      (authSupport.registerWithTD as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.triggerEmailVerification as jest.Mock).mockResolvedValue(true);
      jest.mocked(sendLogToNewRelic).mockResolvedValue();

      const response = await request(app)
        .post("/change-email-support")
        .send(mockRequestBody);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Email change successful. Verification email has been sent");
    });

    it("should return 400 if request validation fails", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequestSupport as jest.Mock).mockReturnValue("Validation error");

      const response = await request(app)
        .post("/change-email-support")
        .send(mockRequestBody);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation error");
    });

    it("should return 401 if current email is invalid", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequestSupport as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/change-email-support")
        .send(mockRequestBody);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid current email.");
    });

    it("should return 409 if new email is already in use", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequestSupport as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock)
        .mockResolvedValueOnce({ uuid: "uuid-123", MUUID: "muuid-456" }) // currentEmail
        .mockResolvedValueOnce({ uuid: "uuid-789" }); // newEmail already in use

      const response = await request(app)
        .post("/change-email-support")
        .send(mockRequestBody);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe("New email is already in use.");
    });

    it("should return 500 if access token retrieval fails", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequestSupport as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock)
        .mockResolvedValueOnce({ uuid: "uuid-123", MUUID: "muuid-456" })
        .mockResolvedValueOnce(null);
      (changeEmailUtils.getAccessTokenByUUID as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post("/change-email-support")
        .send(mockRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Failed to retrieve access token");
    });

    it("should return 500 if updateEmailPref fails for Polaris user", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequestSupport as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock)
        .mockResolvedValueOnce({ uuid: "uuid-123", MUUID: "muuid-456" })
        .mockResolvedValueOnce(null);
      (changeEmailUtils.getAccessTokenByUUID as jest.Mock).mockResolvedValue("access-token");
      (changeEmailUtils.updateEmailPref as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post("/change-email-support")
        .send(mockRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Failed to update user Pref data");
    });

    it("should return 500 if email verification fails", async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (changeEmailUtils.validateRequestSupport as jest.Mock).mockReturnValue(null);
      (changeEmailUtils.getUserProfile as jest.Mock)
        .mockResolvedValueOnce({ uuid: "uuid-123", MUUID: "muuid-456" })
        .mockResolvedValueOnce(null);
      (changeEmailUtils.getAccessTokenByUUID as jest.Mock).mockResolvedValue("access-token");
      (changeEmailUtils.updateEmailPref as jest.Mock).mockResolvedValue({ market: "US" });
      (userMUUID.updateEmail as jest.Mock).mockResolvedValue(true);
      (changeEmailUtils.triggerEmailVerification as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post("/change-email-support")
        .send(mockRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to trigger email verification.");
    });


  });
});