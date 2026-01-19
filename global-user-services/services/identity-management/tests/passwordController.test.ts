import express from 'express';
import axios from 'axios';
import request from "supertest";
import {
  changePassword,
  resetPassword,
  confirmResetPassword,
  validateToken,
  getToken,
} from '../src/controllers/password.controller';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const app = express();
app.use(express.json());
app.post('/change', changePassword);
app.post('/reset', resetPassword);
app.post('/confirm_reset', confirmResetPassword)
app.post('/validate_token', validateToken)
app.post('/get_token', getToken)

jest.mock("../src/Utils/errorHandler")
jest.mock("../src/services/config.service", () => ({
  getConfig: jest.fn()
}))
jest.mock("../src/Utils/shared", () => ({
  validateEmail: jest.fn(),
  validateRequiredField: jest.fn(),
  validateBrandAndRegion: jest.fn(),
  validatePassword: jest.fn(),
  validateConfirmPassword: jest.fn(),
  getMarketIdByLanguage: jest.fn().mockResolvedValue("US"),
  APP_IDS: { AIC: "AIC" },
}));
jest.mock("../src/Utils/newRelicLogger");

import * as configService from "../src/services/config.service";
import * as shared from "../src/Utils/shared"
import { handleApiError } from "../src/Utils/errorHandler";

describe('passwordController (updated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // CHANGE PASSWORD
  describe('changePassword', () => {
    it('should successfully change password', async () => {
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: 'ok', message: 'Password changed successfully' }
      });

      const response = await request(app)
        .post("/change")
        .send({
          access_token: "mockToken",
          currentPassword: "Pass@123",
          newPassword: "Pass@124",
          newPasswordConfirm: "Pass@124",
          brandId: "DW",
          regionId: "NA",
          locale: "en-US",
          redirect_uri: "http://localhost"
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Password changed successfully");
    });

    it('should handle API error response', async () => {
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: 'error', message: 'Invalid current password' }
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Invalid current password',
      });

      const response = await request(app)
        .post("/change")
        .send({
          access_token: "mockToken",
          currentPassword: "Pass@123",
          newPassword: "Pass@124",
          newPasswordConfirm: "Pass@124",
          brandId: "DW",
          regionId: "NA",
          locale: "en-US",
          redirect_uri: ""
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid current password");
    });

    it('should handle network or unexpected errors', async () => {
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      (handleApiError as jest.Mock).mockReturnValue({
        message: 'Failed to change password.',
        statusCode: 400,
      });

      const response = await request(app)
        .post("/change")
        .send({
          access_token: "mockToken",
          currentPassword: "Pass@123",
          newPassword: "Pass@124",
          newPasswordConfirm: "Pass@124",
          brandId: "DW",
          regionId: "NA",
          locale: "en-US",
          redirect_uri: "http://localhost"
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Failed to change password.");
    });

    it('should return 400 if current password is missing', async () => {
      (handleApiError as jest.Mock).mockReturnValue({
        message: 'Input valid current password',
        statusCode: 400,
      });
      const response = await request(app)
        .post("/change")
        .send({
          access_token: "mockToken",
          newPassword: "Pass@124",
          newPasswordConfirm: "Pass@124",
          brandId: "DW",
          regionId: "NA",
          locale: "en-US",
          redirect_uri: "http://localhost"
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Input valid current password");
    });

    it('should return 400 if confirm password does not match', async () => {
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => {
        throw new Error('Confirm password does not match');
      });
      (handleApiError as jest.Mock).mockReturnValue({
        message: 'Confirm password does not match',
        statusCode: 400,
      });
      const response = await request(app)
        .post("/change")
        .send({
          access_token: "mockToken",
          currentPassword: "Pass@123",
          newPassword: "Pass@125",
          newPasswordConfirm: "Pass@124",
          brandId: "CM",
          regionId: "NA",
          locale: "en-US",
          redirect_uri: "http://localhost"
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Confirm password does not match");
    });
  });

  // RESET PASSWORD
  describe('resetPassword', () => {
    it('should successfully send password reset email', async () => {
      (shared.validateEmail as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: 'ok', message: 'Password reset email sent' }
      });

      const response = await request(app)
        .post('/reset')
        .send({
          email: 'test@example.com',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
          redirect_uri: 'http://localhost',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent successfully');
    });

    it('should handle API error response from forgot_password_native', async () => {
      (shared.validateEmail as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: 'error', message: 'User not found' }
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'User not found',
      });

      const response = await request(app)
        .post('/reset')
        .send({
          email: 'test@example.com',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
          redirect_uri: 'http://localhost',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User not found');
    });

    it('should handle network or unexpected errors', async () => {
      (shared.validateEmail as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      (handleApiError as jest.Mock).mockReturnValue({
        message: 'Failed to send password reset email.',
        statusCode: 400,
      });

      const response = await request(app)
        .post('/reset')
        .send({
          email: 'test@example.com',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
          redirect_uri: 'http://localhost',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to send password reset email.');
    });
  });

  // CONFIRM RESET PASSWORD
  describe('confirmResetPassword', () => {
    it('should successfully reset password', async () => {
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: 'ok', message: 'Password reset successfully' }
      });

      const response = await request(app)
        .post('/confirm_reset')
        .send({
          newPassword: 'Pass@1234',
          newPasswordConfirm: 'Pass@1234',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
          redirect_uri: 'http://localhost',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset successfully');
    });

    it('should handle API error response from update_profile_native', async () => {
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: 'error', message: 'Invalid token' }
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Invalid token',
      });

      const response = await request(app)
        .post('/confirm_reset')
        .send({
          newPassword: 'Pass@1234',
          newPasswordConfirm: 'Pass@1234',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
          redirect_uri: 'http://localhost',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should handle confirm password mismatch error', async () => {
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => {
        throw new Error('Confirm password does not match');
      });
      (handleApiError as jest.Mock).mockReturnValue({
        message: 'Confirm password does not match',
        statusCode: 400,
      });

      const response = await request(app)
        .post('/confirm_reset')
        .send({
          newPassword: 'Pass@1234',
          newPasswordConfirm: 'WrongPass@1234',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
          redirect_uri: 'http://localhost',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Confirm password does not match');
    });

    it('should handle password validation error', async () => {
      (shared.validatePassword as jest.Mock).mockImplementation(() => {
        throw new Error('Password must be at least 8 characters long');
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Password must be at least 8 characters long',
      });

      const response = await request(app)
        .post('/confirm_reset')
        .send({
          newPassword: 'short',
          newPasswordConfirm: 'short',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
          redirect_uri: 'http://localhost',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Password must be at least 8 characters long');
    });

    it('should handle network or unexpected errors', async () => {
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Failed to reset password.',
      });

      const response = await request(app)
        .post('/confirm_reset')
        .send({
          newPassword: 'Pass@1234',
          newPasswordConfirm: 'Pass@1234',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
          redirect_uri: 'http://localhost',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to reset password.');
    });

    it('should handle invalid brand or region', async () => {
      (shared.validatePassword as jest.Mock).mockImplementation(() => { });
      (shared.validateConfirmPassword as jest.Mock).mockImplementation(() => { });
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid brand or region');
      });

      const response = await request(app)
        .post('/confirm_reset')
        .send({
          newPassword: 'Pass@1234',
          newPasswordConfirm: 'Pass@1234',
          brandId: 'invalidBrand',
          regionId: 'invalidRegion',
          locale: 'en-US',
          redirect_uri: 'http://localhost',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to reset password.');
    });
  });

  // VALIDATE TOKEN
  describe('validateToken', () => {
    it('should return 400 if code is missing', async () => {
      const response = await request(app)
        .post('/validate_token')
        .send({
          brandId: 'DW',
          regionId: 'NA',
          redirect_uri: 'http://localhost',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Code is required.');
    });

    it('should return 400 if locale is missing', async () => {
      const response = await request(app)
        .post('/validate_token')
        .send({
          code: 'auth-code',
          brandId: 'DW',
          regionId: 'NA',
          redirect_uri: 'http://localhost',
        });

      expect(response.status).toBe(400);
      expect(response.body.errorCode).toBe('missing_argument');
    });

    it('should successfully validate token', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {});
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        passwordResetURL: 'http://localhost/reset',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: 'ok', access_token: 'mockAccessToken' }
      });

      const response = await request(app)
        .post('/validate_token')
        .send({
          code: 'auth-code',
          brandId: 'DW',
          regionId: 'NA',
          redirect_uri: 'http://localhost',
          locale: 'en-US',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token validated successfully');
    });

    it('should handle API error response from /oauth/token', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {});
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        passwordResetURL: 'http://localhost/reset',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: 'error', message: 'Invalid code' }
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Invalid code',
      });

      const response = await request(app)
        .post('/validate_token')
        .send({
          code: 'invalid-code',
          brandId: 'DW',
          regionId: 'NA',
          redirect_uri: 'http://localhost',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid code');
    });

    it('should handle network or unexpected errors', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {});
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        passwordResetURL: 'http://localhost/reset',
        flow: 'flow-name',
        flowVersion: 'v1',
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Failed to validate token.',
      });

      const response = await request(app)
        .post('/validate_token')
        .send({
          code: 'auth-code',
          brandId: 'DW',
          regionId: 'NA',
          redirect_uri: 'http://localhost',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to validate token.');
    });

    it('should handle invalid brand or region', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid brand or region');
      });

      const response = await request(app)
        .post('/validate_token')
        .send({
          code: 'auth-code',
          brandId: 'invalidBrand',
          regionId: 'invalidRegion',
          redirect_uri: 'http://localhost',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to validate token.');
    });
  });

  // GET TOKEN
  describe('getToken', () => {
    it('should return 400 if code is missing', async () => {
      const response = await request(app)
        .post('/get_token')
        .send({
          brandId: 'DW',
          regionId: 'NA',
          redirect_uri: 'http://localhost',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Code is required.');
    });

    it('should return 400 if locale is missing', async () => {
      const response = await request(app)
        .post('/get_token')
        .send({
          code: 'auth-code',
          brandId: 'DW',
          regionId: 'NA',
          redirect_uri: 'http://localhost',
        });

      expect(response.status).toBe(400);
      expect(response.body.errorCode).toBe('missing_argument');
    });

    it('should successfully validate token and return access token', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {});
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        passwordResetURL: 'http://localhost/reset',
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: 'ok', access_token: 'mockAccessToken' }
      });

      const response = await request(app)
        .post('/get_token')
        .send({
          code: 'auth-code',
          brandId: 'DW',
          regionId: 'NA',
          redirect_uri: 'http://localhost',
          locale: 'en-US',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Token validated successfully');
    });

    it('should handle API error response from /oauth/token', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {});
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        passwordResetURL: 'http://localhost/reset',
      });
      mockedAxios.post.mockResolvedValueOnce({
        data: { stat: 'error', message: 'Invalid code' }
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Invalid code',
      });

      const response = await request(app)
        .post('/get_token')
        .send({
          code: 'invalid-code',
          brandId: 'DW',
          regionId: 'NA',
          redirect_uri: 'http://localhost',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid code');
    });

    it('should handle network or unexpected errors', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {});
      (configService.getConfig as jest.Mock).mockReturnValue({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        passwordResetURL: 'http://localhost/reset',
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Failed to validate token.',
      });

      const response = await request(app)
        .post('/get_token')
        .send({
          code: 'auth-code',
          brandId: 'DW',
          regionId: 'NA',
          redirect_uri: 'http://localhost',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to validate token.');
    });

    it('should handle invalid brand or region', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid brand or region');
      });

      const response = await request(app)
        .post('/get_token')
        .send({
          code: 'auth-code',
          brandId: 'invalidBrand',
          regionId: 'invalidRegion',
          redirect_uri: 'http://localhost',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to validate token.');
    });
  });
});