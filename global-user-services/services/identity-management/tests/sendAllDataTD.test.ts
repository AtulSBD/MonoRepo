import axios from 'axios';
import * as sendAllDataTD from '../src/Utils/sendAllDataTD';
import { getConfig } from '../src/services/config.service';
import { User } from '../src/models/UserMuuid.model';
import { registerWithTD } from '../src/services/auth.service';
import UserResponse from '../src/models/UserResponse.model';
import { getUserDetailsFromAIC, normalizeAICUser } from '../src/Utils/shared';

jest.mock('axios');
jest.mock('../src/services/config.service');
jest.mock('../src/models/UserMuuid.model');
jest.mock('../src/services/auth.service');
jest.mock('../src/models/UserResponse.model');
jest.mock('../src/Utils/shared', () => ({
  getUserDetailsFromAIC: jest.fn(),
  normalizeAICUser: jest.fn(() => ({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    demographic: {}
  }))
}));

describe('sendFullUserDataToTD', () => {
  const mockPIData = {
    userpi: {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      primaryAddress: {
        phone: "15555555",
        address1: "123 main",
        address2: "",
        city: "",
        zip: "562143",
        country: "US",
        company: "HCL",
        stateAbbreviation: "CA",
      },
      displayName: "JohnD",
      photos: [],
      uuid: "uuid-1234-5678",
      websiteMemberAccountType: "Premium",
      websiteRegistrationDate: "2023-05-10T12:00:00Z",
      source: "Website",
      deactivateAccount: "",
      demographic: {
        trade: ["Electrician", "Plumber"],
        preferredLanguage: '',
        employmentStatus: '',
        company: ''
      },
      emailVerified: "45454556565",
      display: "",
      currentLocation: "",
      lastUpdated: "2025-08-01T10:30:00Z",
      authorization_code: "auth-code-xyz",
      access_token: "access-token-abc",
      MUUID: "muuid-9876-5432"
    },
    createdDate: "2023-05-10T12:00:00Z",
    lastLogin: "2023-05-10T12:00:00Z"
  };

  const mockUserPrefs = [{
    MUUID: 'muuid123',
    uuid: 'uuid123',
    tool_usage: 'high',
    company: 'TestCo',
    brandId: 'BRANDX',
    regionId: 'REGIONY',
    market: 'US',
    demographicTrades: ['Electrician', 'Plumber'],
    optInNewsletterDate: '2024-01-01',
    optinConfirmDate: '2024-01-02',
    demographicemploymentStatus: 'Employed'
    // Add other fields as needed
  }];

  beforeEach(() => {
    jest.clearAllMocks();
    (User.aggregate as jest.Mock).mockResolvedValue(mockUserPrefs);
    (registerWithTD as jest.Mock).mockResolvedValue(true);
    (getUserDetailsFromAIC as jest.Mock).mockResolvedValue(mockPIData);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should send merged user data to TD', async () => {
    const reqBody = { extraField: 'value', locale: 'en-US' };

    await sendAllDataTD.sendFullUserDataToTD('uuid123', 'CM', 'NA', reqBody);

    expect(registerWithTD).toHaveBeenCalledTimes(1);
    const callArgs = (registerWithTD as jest.Mock).mock.calls[0][0];

    expect(callArgs).toMatchObject({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      ...mockUserPrefs[0],
      ...reqBody,
      uuid: 'uuid123',
      emailverified: mockPIData.userpi.emailVerified,
      brand: 'CM',
      region: 'NA',
    });

    expect(callArgs.demographic.trade).toEqual(mockUserPrefs[0].demographicTrades);
    expect(callArgs.optInNewslettersDate).toEqual(mockUserPrefs[0].optInNewsletterDate);
    expect(callArgs.optinConfirmationDate).toEqual(mockUserPrefs[0].optinConfirmDate);
    expect(callArgs.demographic.employmentStatus).toEqual(mockUserPrefs[0].demographicemploymentStatus);
  });

  it('should not proceed if PI data is missing', async () => {
    (getUserDetailsFromAIC as jest.Mock).mockResolvedValue(null);

    await sendAllDataTD.sendFullUserDataToTD('uuid123', 'brandX', 'regionY', {});
    expect(registerWithTD).not.toHaveBeenCalled();
  });

  it('should not proceed if userPrefs is empty', async () => {
    (User.aggregate as jest.Mock).mockResolvedValue([]);
    await sendAllDataTD.sendFullUserDataToTD('uuid123', 'brandX', 'regionY', {});
    expect(registerWithTD).not.toHaveBeenCalled();
  });

  it('should catch and log error if getUserDetailsFromAIC throws', async () => {
    (getUserDetailsFromAIC as jest.Mock).mockRejectedValue(new Error('AIC error'));
    await sendAllDataTD.sendFullUserDataToTD('uuid123', 'brandX', 'regionY', {});
    expect(registerWithTD).not.toHaveBeenCalled();
  });

  it('should catch and log error if User.aggregate throws', async () => {
    (getUserDetailsFromAIC as jest.Mock).mockResolvedValue(mockPIData);
    (User.aggregate as jest.Mock).mockRejectedValue(new Error('Mongo error'));
    await sendAllDataTD.sendFullUserDataToTD('uuid123', 'brandX', 'regionY', {});
    expect(registerWithTD).not.toHaveBeenCalled();
  });
});