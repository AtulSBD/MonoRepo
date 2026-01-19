import axios from 'axios';
import * as config from '../src/env';
import { sendNonPIIData, registerWithTD, updateEmailVerifiedStatusToTD, registerWithAIC, migrateLagecyUserDataGPR, registerWithIterable } from '../src/services/auth.service';
import { getConfig, getIterableConfig, getTDConfig } from '../src/services/config.service';
import { getUserByUUID } from '../src/Utils/userMuuid';
import { dateToEpochTD, formatDateToTD } from '../src/Utils/shared';
import { UserPref } from '../src/models/UserPref.model';
import { UserTD, changeEmailTD } from '../src/models/UserTD.model';
import { NewsletterTD } from '../src/models/newsletterTD.model';
import UserPII from '../src/models/UserPII.model';
import { sendFullUserDataToTD } from '../src/Utils/sendAllDataTD';
import * as authService from '../src/services/auth.service';
import { sendLogToNewRelic } from '../src/Utils/newRelicLogger';
import { callGraphQL } from '../src/Utils/graphQlHelper';
jest.setTimeout(20000); // 20 seconds for all tests


jest.mock('axios');
jest.mock('../src/env', () => ({
  graphqlURL: 'https://mock-graphql.com',
  newRelicLogApiUrl: 'https://mock-newrelic.com',
  newRelicLogApiKey: 'mock-key',
  migrateApiUrl: 'https://mock-migrate.com',
  baseURL: 'https://mock-base.com'
}));

jest.mock('../src/models/UserPref.model');

jest.mock('../src/models/UserTD.model', () => ({
  UserTD: jest.fn().mockImplementation(() => ({ region: 'NA' })),
  changeEmailTD: jest.fn().mockImplementation(() => ({ region: 'NA' }))
}));

jest.mock('../src/models/newsletterTD.model');

jest.mock('../src/models/UserPII.model', () => {
  
return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      brand: 'CM',
      region: 'NA',
      emailAddress: 'test@example.com'
    }))
  };

});

jest.mock('../src/services/config.service');
jest.mock('../src/Utils/userMuuid');
jest.mock('../src/Utils/shared');
jest.mock('../src/Utils/sendAllDataTD', () => ({
  sendFullUserDataToTD: jest.fn()
}))

describe('sendNonPIIData', () => {
      const payload = {
      email: 'test@example.com',
      uuid: '',
      MUUID: '',
      givenName: '',
      familyName: '',
      emailAddress: '',
      region: '',
      brand: '',
      market: '',
      primaryAddress: {
          phone: '',
          address1: '',
          address2: '',
          city: '',
          zip: '',
          country: '',
          company: '',
          stateAbbreviation: ''
        },
      gender: '',
      birthday: '',
      displayName: '',
      newPassword: '',
      newPasswordConfirm: '',
      redirect_uri: '',
      lastLogin: '',
      lastLoginDate: '',
      neo_aicuuid: '',
      language: '',
      company: '',
      demographic: {
          preferredLanguage: '',
          employmentStatus: '',
          trade: [],
          company: ''
        },
      tool_usage: [],
      islegacy: false,
      ismigrated: false,
      optInProductResearch: false,
      optInProductResearchDate: '',
      optOutProductResearchDate: '',
      optInNewsletters: false,
      optInNewslettersDate: '',
      optOutNewslettersDate: '',
      optinConfirmationDate: '',
      newsletterURL: '',
      projects: [],
      accountstatus: '',
      myInterests: [],
      myExpertise: '',
      advertisingConsent: false,
      advertisingConsentDate: '',
      emailConsent: false,
      sms: false,
      smsDate: '',
      myStores: [],
      typeOfConstructionWork: '',
      experienceLevel: [],
      jobRoleORFunction: [],
      purchaseLocations: [],
      myYardSize: '',
      myDrivewaySize: '',
      howToServiceEquipment: '',
      purchaseEquipementSelfOrBusiness: false,
      source: '',
      locale: '',
      preferencesMigrationStatus: '',
      productsMigrationStatus: '',
      profileMigrationStatus: '',
      createdAt: 0,
      updatedAt: 0,
      createdDate: '',
      updatedDate: '',
      createNewFields: false,
      websiteMemberAccountType: '',
      lastupdateddate: 0,
      emailverified: '',
      globalId: '',
      clientId: '',
      pageurl: '',
      professionalUser: false,
      userId: '',
      employmentStatus: ''
    };

it('should send non-PII data successfully', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: 'success' });
    (UserPref as jest.Mock).mockImplementation(() => ({ mock: 'data' }));
    const result = await sendNonPIIData(payload);
    expect(result).toBe('success');
  });



  it('should handle error when sending non-PII data', async () => {
    (axios.post as jest.Mock).mockRejectedValue({ response: { data: 'error' } });
    await expect(sendNonPIIData(payload)).rejects.toEqual('error');
  });
});


describe('registerWithTD', () => {
  const payload = {
    email: 'test@example.com',
    uuid: '',
    MUUID: '',
    givenName: '',
    familyName: '',
    emailAddress: '',
    region: 'NA',
    brand: 'CM',
    market: 'US',
    primaryAddress: {
      phone: '',
      address1: '',
      address2: '',
      city: '',
      zip: '',
      country: '',
      company: '',
      stateAbbreviation: ''
    },
    gender: '',
    birthday: '',
    displayName: '',
    newPassword: '',
    newPasswordConfirm: '',
    redirect_uri: '',
    lastLogin: '',
    lastLoginDate: '',
    neo_aicuuid: '',
    language: '',
    company: '',
    demographic: {
      preferredLanguage: '',
      employmentStatus: '',
      trade: [],
      company: ''
    },
    tool_usage: [],
    islegacy: false,
    ismigrated: false,
    optInProductResearch: false,
    optInProductResearchDate: '',
    optOutProductResearchDate: '',
    optInNewsletters: false,
    optInNewslettersDate: '',
    optOutNewslettersDate: '',
    optinConfirmationDate: '',
    newsletterURL: '',
    projects: [],
    accountstatus: '',
    myInterests: [],
    myExpertise: '',
    advertisingConsent: false,
    advertisingConsentDate: '',
    emailConsent: false,
    sms: false,
    smsDate: '',
    myStores: [],
    typeOfConstructionWork: '',
    experienceLevel: [],
    jobRoleORFunction: [],
    purchaseLocations: [],
    myYardSize: '',
    myDrivewaySize: '',
    howToServiceEquipment: '',
    purchaseEquipementSelfOrBusiness: false,
    source: '',
    locale: '',
    preferencesMigrationStatus: '',
    productsMigrationStatus: '',
    profileMigrationStatus: '',
    createdAt: 0,
    updatedAt: 0,
    createdDate: '',
    updatedDate: '',
    createNewFields: false,
    websiteMemberAccountType: '',
    lastupdateddate: 0,
    emailverified: '',
    globalId: '',
    clientId: '',
    pageurl: '',
    professionalUser: false,
    userId: '',
      employmentStatus: ''
  };

  const mockConfig = {
    baseUri: 'https://td.com',
    dbName: 'db',
    tableName: 'table',
    writeKey: 'key'
  };

beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register user with TD successfully (signup)', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: 'td-success' });
    (getTDConfig as jest.Mock).mockReturnValue(mockConfig);
    (UserTD as jest.Mock).mockImplementation(() => ({ region: 'NA' }));
    jest.spyOn(authService, 'getAuthTokenForTD').mockResolvedValue('mock-token');

    const result = await authService.registerWithTD(payload, 'signup');
    expect(result).toBe('td-success');
    expect(UserTD).toHaveBeenCalledWith(payload);
  });

  it('should register user with TD successfully (nl)', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: 'td-success' });
    (getTDConfig as jest.Mock).mockReturnValue(mockConfig);
    (NewsletterTD as jest.Mock).mockImplementation(() => ({ region: 'NA' }));
    jest.spyOn(authService, 'getAuthTokenForTD').mockResolvedValue('mock-token');

    const result = await authService.registerWithTD(payload, 'nl');
    expect(result).toBe('td-success');
    expect(NewsletterTD).toHaveBeenCalledWith(payload);
  });

  it('should register user with TD successfully (changeEmail)', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: 'td-success' });
    (getTDConfig as jest.Mock).mockReturnValue(mockConfig);
    (changeEmailTD as jest.Mock).mockImplementation(() => ({ region: 'NA' }));
    jest.spyOn(authService, 'getAuthTokenForTD').mockResolvedValue('mock-token');

    const result = await authService.registerWithTD(payload, 'changeEmail');
    expect(result).toBe('td-success');
    expect(changeEmailTD).toHaveBeenCalledWith(payload);
  });

  it('should send correct RegionId if region is EMEA', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: 'td-success' });
    (getTDConfig as jest.Mock).mockReturnValue(mockConfig);
    (UserTD as jest.Mock).mockImplementation(() => ({ region: 'EMEA' }));
    jest.spyOn(authService, 'getAuthTokenForTD').mockResolvedValue('mock-token');

    const result = await authService.registerWithTD({ ...payload, region: 'EMEA' }, 'signup');
    expect(result).toBe('td-success');
    expect(axios.post).toHaveBeenCalledWith(
      'https://td.com/db/table',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          "RegionId": "EMEA"
        })
      })
    );
  });

  it('should handle error during TD registration (Error instance)', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('TD error'));
    (getTDConfig as jest.Mock).mockReturnValue(mockConfig);
    (UserTD as jest.Mock).mockImplementation(() => ({ region: 'NA' }));
    jest.spyOn(authService, 'getAuthTokenForTD').mockResolvedValue('mock-token');

    const result = await authService.registerWithTD(payload, 'signup');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('TD error');
  });

  it('should handle error during TD registration (error object with message)', async () => {
    (axios.post as jest.Mock).mockRejectedValue({ message: 'TD error' });
    (getTDConfig as jest.Mock).mockReturnValue(mockConfig);
    (UserTD as jest.Mock).mockImplementation(() => ({ region: 'NA' }));
    jest.spyOn(authService, 'getAuthTokenForTD').mockResolvedValue('mock-token');

    const result = await authService.registerWithTD(payload, 'signup');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('TD error');
  });

  it('should handle error during TD registration (error object with no message)', async () => {
    (axios.post as jest.Mock).mockRejectedValue({});
    (getTDConfig as jest.Mock).mockReturnValue(mockConfig);
    (UserTD as jest.Mock).mockImplementation(() => ({ region: 'NA' }));
    jest.spyOn(authService, 'getAuthTokenForTD').mockResolvedValue('mock-token');

    const result = await authService.registerWithTD(payload, 'signup');
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe(""); 
  });

  it('should return undefined if config is missing', async () => {
    (getTDConfig as jest.Mock).mockReturnValue(undefined);
    (UserTD as jest.Mock).mockImplementation(() => ({ region: 'NA' }));

    const result = await authService.registerWithTD(payload, 'signup');
    expect(result).toBeUndefined();
  });

  it('should return undefined if region is missing', async () => {
    (UserTD as jest.Mock).mockImplementation(() => ({ region: '' }));

    const result = await authService.registerWithTD(payload, 'signup');
    expect(result).toBeUndefined();
  });
});

describe('updateEmailVerifiedStatusToTD', () => {
  const mockUUID = 'test-uuid';
  const mockRegionId = 'in';
 const mockUserData = {
  aicId: mockUUID,
  uuid: mockUUID, // add this line
  muuid: 'mock-muuid',
  brandId: 'brand-123',
  locale: 'en-us'

};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send email verified status to TD successfully', async () => {
    (getTDConfig as jest.Mock).mockReturnValue({
      baseUri: 'https://td.example.com',
      dbName: 'testDB',
      tableName: 'users',
      writeKey: 'write-key-123'
    });

    (getUserByUUID as jest.Mock).mockResolvedValue(mockUserData);
    (dateToEpochTD as jest.Mock).mockReturnValue(1234567890);
    (sendFullUserDataToTD as jest.Mock).mockResolvedValue({ success: true });

    const result = await updateEmailVerifiedStatusToTD(mockUUID, mockRegionId, mockUserData.locale);

    expect(getTDConfig).toHaveBeenCalledWith('TD_all_user_register_IN');
    expect(getUserByUUID).toHaveBeenCalledWith(mockUUID);
const callArgs = (sendFullUserDataToTD as jest.Mock).mock.calls[0];
expect(callArgs[0]).toBe(mockUUID);
expect(callArgs[1]).toBe(mockUserData.brandId);
expect(callArgs[2]).toBe(mockRegionId);
expect(callArgs[3]).toEqual(expect.objectContaining({
  emailverified: 1234567890,
  locale: 'en-us',
  updatedDate: expect.any(Date), // Match the Date object!
}));
    expect(result).toEqual({ success: true });
  });

  it('should throw error if user not found', async () => {
    (getUserByUUID as jest.Mock).mockResolvedValue({});

    const result = await updateEmailVerifiedStatusToTD(mockUUID, mockRegionId,mockUserData.locale);

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('There are not user with this UUID');
  });

  it('should handle unexpected errors gracefully', async () => {
    (getUserByUUID as jest.Mock).mockRejectedValue(new Error('DB error'));

    const result = await updateEmailVerifiedStatusToTD(mockUUID, mockRegionId,mockUserData.locale);

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('DB error');
  });
});


describe('registerWithAIC', () => {
  const payload = {
    email: 'test@example.com',
    locale: 'en',
    redirect_uri: 'https://redirect.com',
    brand: 'CM',
    region: 'NA',
    market: 'US',
    emailAddress: 'test@example.com',
    displayName: 'Test User',
    // ... other fields omitted for brevity
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register user with AIC successfully', async () => {
    const mockConfig = {
      clientId: 'client',
      flow: 'flow',
      flowVersion: 'v1',
    };

    const mockUserPII = {
      brand: 'CM',
      region: 'NA',
      market: 'US',
      emailAddress: 'test@example.com',
      displayName: 'Test User',
      locale: 'en',
      redirect_uri: 'https://redirect.com',
    };

    (getConfig as jest.Mock).mockReturnValue(mockConfig);
    (UserPII as jest.Mock).mockImplementation(() => mockUserPII);
    (axios.post as jest.Mock).mockResolvedValue({
      data: { stat: 'ok', result: 'registered' },
    });

    const callback = jest.fn();
    await registerWithAIC(payload as any, callback);

    expect(callback).toHaveBeenCalledWith(null, { stat: 'ok', result: 'registered' });
  });

  it('should handle error during AIC registration', async () => {
    const mockConfig = {
      clientId: 'client',
      flow: 'flow',
      flowVersion: 'v1',
    };

    const mockUserPII = {
      brand: 'CM',
      region: 'NA',
      market: 'US',
      emailAddress: 'test@example.com',
      displayName: 'Test User',
      locale: 'en',
      redirect_uri: 'https://redirect.com',
    };

    (getConfig as jest.Mock).mockReturnValue(mockConfig);
    (UserPII as jest.Mock).mockImplementation(() => mockUserPII);
    (axios.post as jest.Mock).mockRejectedValue(new Error('AIC error'));

    const callback = jest.fn();
    await registerWithAIC(payload as any, callback);

    expect(callback).toHaveBeenCalledWith(expect.any(Error), null);
  });
});


describe('migrateLagecyUserDataGPR', () => {
  const payload = {
        emailAddress: 'test@example.com',
        brand: 'CM',
        region: 'NA',
        market: 'US',
        uuid: 'uuid123',
        MUUID: 'muuid123',
        givenName: '',
        familyName: '',
        email: '',
        primaryAddress: {
          phone: '',
          address1: '',
          address2: '',
          city: '',
          zip: '',
          country: '',
          company: '',
          stateAbbreviation: ''
        },
        gender: '',
        birthday: '',
        displayName: '',
        newPassword: '',
        newPasswordConfirm: '',
        redirect_uri: '',
        lastLogin: '',
        lastLoginDate: '',
        neo_aicuuid: '',
        language: '',
        company: '',
        demographic: {
          preferredLanguage: '',
          employmentStatus: '',
          trade: [],
          company: ''
        },
        tool_usage: [],
        islegacy: false,
        ismigrated: false,
        optInProductResearch: false,
        optInProductResearchDate: '',
        optOutProductResearchDate: '',
        optInNewsletters: false,
        optInNewslettersDate: '',
        optOutNewslettersDate: '',
        optinConfirmationDate: '',
        newsletterURL: '',
        projects: [],
        accountstatus: '',
        myInterests: [],
        myExpertise: '',
        advertisingConsent: false,
        advertisingConsentDate: '',
        emailConsent: false,
        sms: false,
        smsDate: '',
        myStores: [],
        typeOfConstructionWork: '',
        experienceLevel: [],
        jobRoleORFunction: [],
        purchaseLocations: [],
        myYardSize: '',
        myDrivewaySize: '',
        howToServiceEquipment: '',
        purchaseEquipementSelfOrBusiness: false,
        source: '',
        locale: '',
        preferencesMigrationStatus: '',
        productsMigrationStatus: '',
        profileMigrationStatus: '',
        createdAt: 0,
        updatedAt: 0,
        createdDate: '',
        updatedDate: '',
        createNewFields: false,
        websiteMemberAccountType: '',
        lastupdateddate: 0,
        emailverified: '',
        globalId: '',
        clientId: '',
        pageurl: '',
        professionalUser: false,
        userId: '',
      employmentStatus: ''
    }
  it('should migrate legacy user data successfully', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: 'migrated' });
    const result = await migrateLagecyUserDataGPR(payload);
    expect(result).toBe('migrated');
  });

  it('should handle error during legacy migration', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('Migration error'));
    const result = await migrateLagecyUserDataGPR(payload);
    expect(result).toBeInstanceOf(Error);
  });
});


describe('registerWithIterable', () => {
  const mockUser = {
    locale: 'en-US',
    givenName: 'John',
    familyName: 'Doe',
    source: 'website',
    marketName: 'US',
    brand: 'BRANDX',
    emailAddress: 'john.doe@example.com',
    region: 'EM_EANZ',
  };

  const mockConfig = {
    apiUrl: 'https://api.iterable.com/api/events/track',
    apikey: 'test-api-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send data to Iterable and return response data', async () => {
    (getIterableConfig as jest.Mock).mockReturnValue(mockConfig);
    (axios.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    const result = await registerWithIterable(mockUser as any);

    expect(getIterableConfig).toHaveBeenCalledWith('ITERABLE_BRANDX_EMEA');
    expect(axios.post).toHaveBeenCalledWith(
      mockConfig.apiUrl,
      expect.objectContaining({
        eventName: 'DOI_TRIGGER',
        email: mockUser.emailAddress,
        dataFields: expect.objectContaining({
          locale_code: 'US-en',
          first_name: 'John',
          last_name: 'Doe',
          source: 'website',
          market: 'US',
          brand: 'BRANDX',
        }),
      }),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': mockConfig.apikey,
        },
      })
    );
    expect(result).toEqual({ success: true });
  });

  it('should return undefined if config is missing', async () => {
    (getIterableConfig as jest.Mock).mockReturnValue(undefined);

    const result = await registerWithIterable(mockUser as any);

    expect(result).toBeUndefined();
  });

  it('should handle axios error gracefully', async () => {
    (getIterableConfig as jest.Mock).mockReturnValue(mockConfig);
    (axios.post as jest.Mock).mockRejectedValue(new Error('Network Error'));

    const result = await registerWithIterable(mockUser as any);

    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Network Error');
  });

  it('should return undefined if region is not provided', async () => {
    const userWithoutRegion = { ...mockUser, region: undefined };
    const result = await registerWithIterable(userWithoutRegion as any);
    expect(result).toBeUndefined();
  });
});

