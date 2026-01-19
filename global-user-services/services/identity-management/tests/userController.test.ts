import express from 'express';
import axios from 'axios';
import request from "supertest";
import { userController } from '../src/controllers/user.controller';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const app = express();
app.use(express.json());
const UserController = new userController();
app.post("/user-data", UserController.getUserData.bind(UserController));
app.post("/get-user-by-muuid", UserController.getUserByMuuid.bind(UserController));
app.put("/updateprofile", UserController.updateUserData.bind(UserController))
app.put("/update-user-by-muuid", UserController.updateUserDataByMuuid.bind(UserController))
app.post("/user-details", UserController.getUserDetails.bind(UserController));

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
  fetchUserDetailsFromAicApi: jest.fn(),
  getMarketIdByLanguage: jest.fn().mockResolvedValue("US"),
  APP_IDS: { AIC: "AIC" },
}));
jest.mock("../src/Utils/changeEmailUtil", () => ({
  validateRequest: jest.fn(),
  validateRequestSupport: jest.fn(),
  getUserProfile: jest.fn(),
  getAccessTokenByUUID: jest.fn(),
  triggerEmailVerification: jest.fn(),
  updateEmailPref: jest.fn(),
  validateEmail: jest.fn()
}));
jest.mock("../src/services/user.service", () => ({
  userService: jest.fn(),
  getuserData: jest.fn()
}))
jest.mock("../src/Utils/userMuuid", () => ({
  getOrCreateMuuid: jest.fn(),
  getUserByUUID: jest.fn(),
  linkMuuidWithAggressiveDetails: jest.fn(),
  handleNewsletterSignup: jest.fn(),
  updateEmail: jest.fn()
}))
jest.mock("../src/Utils/newRelicLogger");
jest.mock('../src/models/UserResponse.model', () => {
  return jest.fn().mockImplementation((data) => data);
});
jest.mock('../src/models/UserMuuid.model', () => ({
  User: {
    findOne: jest.fn(),
  },
  UserPref: {
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    aggregate: jest.fn()
  },
  UserRegisteredProduct: {
    aggregate: jest.fn(),
    find: jest.fn(),
  },
  UserProductAgg: {
    find: jest.fn()
  }
}));
jest.mock('../src/services/auth.service', () => ({
  sendNonPIIData: jest.fn(),
  sendFullUserDataToTD: jest.fn(),
  registerWithTD: jest.fn(),
}));

import * as authSupport from "../src/services/auth.service";
import * as userMUUID from "../src/Utils/userMuuid";
import * as configService from "../src/services/config.service";
import * as shared from "../src/Utils/shared"
import * as changeEmailUtils from "../src/Utils/changeEmailUtil";
import { handleApiError } from "../src/Utils/errorHandler";
import * as userService from "../src/services/user.service";
import { User, UserPref, UserRegisteredProduct, UserProductAgg } from "../src/models/UserMuuid.model";

describe('userController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authSupport.sendNonPIIData as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('getUserData', () => {
    it('should return 400 if locale is missing', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      const response = await request(app)
        .post('/user-data')
        .send({
          id: 'mock-uuid',
          brandId: 'DW',
          regionId: 'NA',
        });
      expect(response.status).toBe(400);
      expect(response.body.errorCode).toBe('missing_argument');
    });

    it('should successfully fetch user data', async () => {
      const mockResponseData = {
        data: {
          stat: 'ok',
          result: {
            firstName: "John",
            lastName: "Doe",
            email: "mockemail@mail.com",
            MUUID: "mockMUUID",
            uuid: "mock-uuid"
          },
        },
      };
      const mockUserPref = {
        email: "mockemail@mail.com",
        MUUID: "mockMUUID",
        uuid: "mock-uuid",
        tool_usage: "Personal",
        market: "US",
        userId: "mockemail@mail.com",
        regionId: "NA",
        brandId: "DW",
        accountStatus: "active"
      };
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        ownerId: 'owner-id',
        ownerSecret: 'owner-secret',
        entity: 'userEntity',
      });
      (axios.get as jest.Mock).mockResolvedValueOnce(mockResponseData);
      (UserPref.aggregate as jest.Mock).mockResolvedValueOnce([mockUserPref]);

      const response = await request(app)
        .post('/user-data')
        .send({
          id: 'mock-uuid',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User data');
      expect(response.body.data.tool_usage).toBe("Personal");
      expect(response.body.data.uuid).toBe("mock-uuid");
    });

    it('should handle API error response from /entity', async () => {
      const mockErrorResponse = {
        data: {
          stat: 'error',
          code: 200,
          message: 'User not found',
        },
      };
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        ownerId: 'owner-id',
        ownerSecret: 'owner-secret',
        entity: 'userEntity',
      });
      (axios.get as jest.Mock).mockResolvedValueOnce(mockErrorResponse);
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'User not found',
      });

      const response = await request(app)
        .post('/user-data')
        .send({
          id: 'mock-uuid',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User not found');
    });

    it('should handle network or unexpected errors', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        ownerId: 'owner-id',
        ownerSecret: 'owner-secret',
        entity: 'userEntity',
      });
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Failed to fetch user data',
      });

      const response = await request(app)
        .post('/user-data')
        .send({
          id: 'user-id',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to fetch user data');
    });

    it('should handle invalid brand or region', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid brand or region');
      });

      const response = await request(app)
        .post('/user-data')
        .send({
          id: 'user-id',
          brandId: 'invalidBrand',
          regionId: 'invalidRegion',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to fetch user data');
    });

    it('should return 400 if no userPrefs found', async () => {
      const mockResponseData = {
        data: {
          stat: 'ok',
          result: {
            firstName: "John",
            lastName: "Doe",
            email: "mockemail@mail.com",
            MUUID: "mockMUUID",
            uuid: "mock-uuid"
          },
        },
      };
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (configService.getConfig as jest.Mock).mockReturnValue({
        ownerId: 'owner-id',
        ownerSecret: 'owner-secret',
        entity: 'userEntity',
      });
      (axios.get as jest.Mock).mockResolvedValueOnce(mockResponseData);
      (UserPref.aggregate as jest.Mock).mockResolvedValueOnce([]);

      const response = await request(app)
        .post('/user-data')
        .send({
          id: 'mock-uuid',
          brandId: 'DW',
          regionId: 'NA',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Records not found');
    });
  });

  describe('updateUserData', () => {
    it('should successfully update user data', async () => {
      const mockUpdateResponse = { success: true };
      const mockUser = { muuid: 'mockMUUID', email: 'mockemail@mail.com' };
      const mockUserData = { givenName: 'John', familyName: 'Doe' };
      const mockUserPref = { toObject: () => ({ demographic: {}, demographicTrades: [] }) };

      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (userService.userService as jest.Mock).mockResolvedValueOnce(mockUpdateResponse);
      (userMUUID.getUserByUUID as jest.Mock).mockResolvedValueOnce(mockUser);
      (userService.getuserData as jest.Mock).mockResolvedValueOnce(mockUserData);
      (UserPref.findOne as jest.Mock).mockResolvedValueOnce(mockUserPref);

      const response = await request(app)
        .put('/updateprofile')
        .send({
          id: 'user-id',
          brandId: 'DW',
          regionId: 'NA',
          accessToken: 'mock-token',
          locale: 'en-US',
          email: 'john@example.com',
          givenName: 'John',
          familyName: 'Doe',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User data updated successfully');
      expect(response.body.data).toEqual(mockUpdateResponse);
    });

    it('should return 400 if no user data is provided', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      const response = await request(app)
        .put('/updateprofile')
        .send({
          id: 'user-id',
          brandId: 'DW',
          regionId: 'NA',
          accessToken: 'mock-token',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No user data provided for update');
    });

    it('should return 400 if updateUser returns errorCode', async () => {
      const mockErrorResponse = { errorCode: 'ERR001', message: 'Update failed' };

      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (userService.userService as jest.Mock).mockResolvedValueOnce(mockErrorResponse);

      const response = await request(app)
        .put('/updateprofile')
        .send({
          id: 'user-id',
          brandId: 'DW',
          regionId: 'NA',
          accessToken: 'mock-token',
          locale: 'en-US',
          email: 'john@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(mockErrorResponse);
    });

    it('should handle unexpected errors', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (userService.userService as jest.Mock).mockRejectedValueOnce(new Error('Unexpected error'));
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Failed to update user data',
      });

      const response = await request(app)
        .put('/updateprofile')
        .send({
          id: 'user-id',
          brandId: 'DW',
          regionId: 'NA',
          accessToken: 'mock-token',
          locale: 'en-US',
          email: 'john@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to update user data');
    });

    it('should handle invalid brand or region', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid brand or region');
      });
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Failed to update user data',
      });

      const response = await request(app)
        .put('/updateprofile')
        .send({
          id: 'user-id',
          brandId: 'invalidBrand',
          regionId: 'invalidRegion',
          accessToken: 'mock-token',
          locale: 'en-US',
          email: 'john@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to update user data');
    });
  });

  describe('getUserByMuuid', () => {
    it('should return 400 for unexpected fields in request body', async () => {
      const response = await request(app)
        .post('/get-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          brandId: 'DW',
          regionId: 'NA',
          extraField: 'unexpected',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Invalid combination of fields. Allowed fields: muuid, brandId, regionId, locale.'
      );
    });

    it('should return 404 if user not found with given muuid', async () => {
      (User.findOne as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/get-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          locale: 'en-US'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found with given muuid');
    });

    it('should return 404 if userPrefs not found for muuid', async () => {
      (User.findOne as jest.Mock).mockResolvedValueOnce({ MUUID: 'mockMUUID' });
      (UserPref.find as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/get-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          locale: 'en-US'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found for given muuid in userProductdAgg');
    });

    it('should handle unexpected errors', async () => {
      (User.findOne as jest.Mock).mockRejectedValueOnce(new Error('Unexpected error'));
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 500,
        message: 'Something went wrong while getting user data',
      });

      const response = await request(app)
        .post('/get-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          locale: 'en-US'
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Something went wrong while getting user data');
    });

    it('should return 400 if only brandId or regionId is provided without valid combination', async () => {
      const response = await request(app)
        .post('/get-user-by-muuid')
        .send({
          brandId: 'DW',
          regionId: 'NA',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'muuid and locale are required fields.'
      );
    });

    it('should return 404 if userPrefs is empty for muuid, brandId, and regionId', async () => {
      (User.findOne as jest.Mock).mockResolvedValueOnce({ MUUID: 'mockMUUID' });
      (UserPref.find as jest.Mock).mockResolvedValueOnce([]);
      (UserRegisteredProduct.find as jest.Mock).mockResolvedValueOnce([]);
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      const response = await request(app)
        .post('/get-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          brandId: 'dw',
          regionId: 'na',
          locale: 'en-US'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found for given muuid in userProductdAgg');
    });

    it('should return 400 if muuid and brandId are provided but regionId is missing', async () => {
      const response = await request(app)
        .post('/get-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          brandId: 'DW',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'muuid and locale are required fields.'
      );
    });
  });

  describe('updateUserDataByMuuid', () => {
    it('should return 400 if no user data is provided', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      const response = await request(app)
        .put('/update-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          brandId: 'DW',
          regionId: 'NA',
          accessToken: 'mock-token',
          locale: 'en-US',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No user data provided for update');
    });

    it('should return 404 if userPrefs not found for muuid', async () => {
      (User.findOne as jest.Mock).mockResolvedValueOnce({ MUUID: 'mockMUUID' });
      (UserPref.find as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/get-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          locale: 'en-US'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found for given muuid in userProductdAgg');
    });

    it('should return 400 if userService returns errorCode', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (UserPref.findOne as jest.Mock).mockResolvedValueOnce({ uuid: 'mockUUID' });
      (userService.userService as jest.Mock).mockResolvedValueOnce({ errorCode: 'ERR001', message: 'Update failed' });

      const response = await request(app)
        .put('/update-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          brandId: 'DW',
          regionId: 'NA',
          accessToken: 'mock-token',
          locale: 'en-US',
          email: 'john@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Update failed');
    });

    it('should return 500 if UserPref update fails', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (UserPref.findOne as jest.Mock).mockResolvedValueOnce({ uuid: 'mockUUID' });
      (userService.userService as jest.Mock).mockResolvedValueOnce({ success: true });
      (UserPref.findOneAndUpdate as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/update-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          brandId: 'DW',
          regionId: 'NA',
          accessToken: 'mock-token',
          locale: 'en-US',
          email: 'john@example.com',
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Someting went wrong while updating userPrefs');
    });

    it('should successfully update user data', async () => {
      const mockUser = { muuid: 'mockMUUID', email: 'john@example.com' };
      const mockUserData = { givenName: 'John', familyName: 'Doe' };
      const mockUpdateResponse = { success: true };

      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (UserPref.findOne as jest.Mock).mockResolvedValueOnce({
        uuid: 'mockUUID',
        toObject: () => ({ demographic: {}, demographicTrades: [] }),
      });
      (userService.userService as jest.Mock).mockResolvedValueOnce(mockUpdateResponse);
      (UserPref.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({ updated: true });
      (userMUUID.getUserByUUID as jest.Mock).mockResolvedValueOnce(mockUser);
      (userService.getuserData as jest.Mock).mockResolvedValueOnce(mockUserData);

      const response = await request(app)
        .put('/update-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          brandId: 'DW',
          regionId: 'NA',
          accessToken: 'mock-token',
          locale: 'en-US',
          email: 'john@example.com',
          givenName: 'John',
          familyName: 'Doe',
          // add more fields if needed
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User data updated successfully');
      expect(response.body.data).toEqual(mockUpdateResponse);
    });

    it('should handle unexpected errors', async () => {
      (shared.validateBrandAndRegion as jest.Mock).mockImplementation(() => { });
      (UserPref.findOne as jest.Mock).mockRejectedValueOnce(new Error('Unexpected error'));
      (handleApiError as jest.Mock).mockReturnValue({
        statusCode: 400,
        message: 'Failed to update user data',
      });

      const response = await request(app)
        .put('/update-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          brandId: 'DW',
          regionId: 'NA',
          accessToken: 'mock-token',
          locale: 'en-US',
          email: 'john@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Failed to update user data');
    });
  });

  describe('getUserDetails', () => {
    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/user-details')
        .send({ locale: 'en-US' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email is required');
    });

    it('should return 400 if locale is missing', async () => {
      const response = await request(app)
        .post('/user-details')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.errorCode).toBe('missing_argument');
    });

    it('should return 400 if email format is invalid', async () => {
      (changeEmailUtils.validateEmail as jest.Mock).mockReturnValue(false);

      const response = await request(app)
        .post('/user-details')
        .send({ email: 'invalid-email', locale: 'en-US' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid email format');
    });

    it('should return 404 if user not found with given muuid', async () => {
      (User.findOne as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/get-user-by-muuid')
        .send({
          muuid: 'mockMUUID',
          locale: 'en-US'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found with given muuid');
    });

    it('should return user details successfully', async () => {
      const mockUser = { MUUID: 'mockMUUID' };
      const mockAggRecords = [
        {
          uuid: 'uuid1',
          brandId: 'DW',
          regionId: 'NA',
        },
      ];
      const mockExtUserData = {
        givenName: 'John',
        familyName: 'Doe',
        emailVerified: true,
        source: 'AIC',
        websiteMemberAccountType: 'Premium',
        websiteRegistrationDate: '2023-01-01',
        migratedDate: '2023-01-01',
      };

      (changeEmailUtils.validateEmail as jest.Mock).mockReturnValue(true);
      (User.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (UserProductAgg.find as jest.Mock).mockResolvedValueOnce(mockAggRecords);
      (shared.fetchUserDetailsFromAicApi as jest.Mock).mockResolvedValueOnce(mockExtUserData);

      const response = await request(app)
        .post('/user-details')
        .send({ email: 'test@example.com', locale: 'en-US' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User data');
      expect(response.body.userData[0].firstName).toBe('John');
      expect(response.body.userData[0].isMigrated).toBe(true);
    });

    it('should handle internal server error', async () => {
      (changeEmailUtils.validateEmail as jest.Mock).mockReturnValue(true);
      (User.findOne as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app)
        .post('/user-details')
        .send({ email: 'test@example.com', locale: 'en-US' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Internal server error');
    });
  });
});