import mongoose from "mongoose";
import {
  validateBrandAndRegion,
  dateStringToEpoch,
  parseYYYYMMDD_HHMMSS_TO_TD,
  sanitizeUserPrefInput,
  dateToEpochTD,
  getRegionIdValue,
  getUserFullData,
  mapPreferencesToFields
} from "../src/utils/shared";
import { formatMemory, formatUptime } from "../src/utils/shared";

import { sendLogToNewRelic } from "../newRelicLogger";
import { getUserData } from "../src/services/getUserData";

// Mock external dependencies
jest.mock("../newRelicLogger", () => ({
  sendLogToNewRelic: jest.fn()
}));
jest.mock("../src/services/getUserData", () => ({
  getUserData: jest.fn()
}));

const mockCollection = {
  findOne: jest.fn(),
  aggregate: jest.fn()
};
const mockToArray = jest.fn();

beforeAll(() => {
  // @ts-ignore
  mongoose.connection.collection = jest.fn().mockImplementation((name) => mockCollection);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("validateBrandAndRegion", () => {
  it("throws if brandId or regionId missing", async () => {
    await expect(validateBrandAndRegion({ brandId: "DW" })).rejects.toThrow(/provide the brandId and regionId/);
    await expect(validateBrandAndRegion({ regionId: "US" })).rejects.toThrow(/provide the brandId and regionId/);
  });

  it("throws if brandId is invalid", async () => {
    await expect(validateBrandAndRegion({ brandId: "XX", regionId: "US" })).rejects.toThrow(/Invalid brand ID/);
  });

  it("throws if regionId is invalid", async () => {
    mockCollection.findOne.mockResolvedValue(null);
    await expect(validateBrandAndRegion({ brandId: "DW", regionId: "XX" })).rejects.toThrow(/Invalid region ID/);
  });

  it("passes for valid brand and region", async () => {
    mockCollection.findOne.mockResolvedValue({ _id: "US" });
    await expect(validateBrandAndRegion({ brandId: "DW", regionId: "US" })).resolves.toBeUndefined();
  });
});

describe("dateStringToEpoch", () => {
  it("returns undefined for invalid input", () => {
    expect(dateStringToEpoch("")).toBeUndefined();
    expect(dateStringToEpoch("notadate")).toBeUndefined();
    expect(dateStringToEpoch("12/31")).toBeUndefined();
    expect(dateStringToEpoch(undefined as any)).toBeUndefined();
  });

  it("parses valid mm/dd/yyyy", () => {
    expect(dateStringToEpoch("12/31/2023")).toBe(Math.floor(new Date("2023-12-31T00:00:00Z").getTime() / 1000));
  });
});

describe("parseYYYYMMDD_HHMMSS_TO_TD", () => {
  it("returns undefined for invalid format", () => {
    expect(parseYYYYMMDD_HHMMSS_TO_TD("2023-12-31")).toBeUndefined();
    expect(parseYYYYMMDD_HHMMSS_TO_TD("notadate")).toBeUndefined();
  });

  it("parses valid format", () => {
    const dateStr = "2023-12-31 23:59:59.123456 +0000";
    const expected = Math.floor(new Date("2023-12-31T23:59:59.123Z").getTime() / 1000);
    expect(parseYYYYMMDD_HHMMSS_TO_TD(dateStr)).toBe(expected);
  });
});

describe("sanitizeUserPrefInput", () => {
  it("removes top-level and nested fields", () => {
    const input = {
      uuid: "abc",
      emailVerified: true,
      lastLogin: "date",
      isLegacyUser: true,
      isMigrated: true,
      company: "Co",
      demographicTrades: "trade",
      jobRoleORFunction: "role",
      websiteMemberAccountType: "type",
      source: "src",
      tool_usage: "usage",
      employmentStatus: "status",
      demographic: {
        keep: "keep"
      },
      keep: "keep"
    };
    const result = sanitizeUserPrefInput(input);
    expect(result).not.toHaveProperty("uuid");
    expect(result).not.toHaveProperty("emailVerified");
    expect(result).not.toHaveProperty("lastLogin");
    expect(result).not.toHaveProperty("isLegacyUser");
    expect(result).not.toHaveProperty("isMigrated");
    expect(result).not.toHaveProperty("company");
    expect(result).not.toHaveProperty("demographicTrades");
    expect(result).not.toHaveProperty("jobRoleORFunction");
    expect(result).not.toHaveProperty("websiteMemberAccountType");
    expect(result).not.toHaveProperty("source");
    expect(result).not.toHaveProperty("tool_usage");
    expect(result).not.toHaveProperty("employmentStatus");
    expect(result.demographic).not.toHaveProperty("employmentStatus");
    expect(result.demographic).not.toHaveProperty("occupation");
    expect(result.demographic).not.toHaveProperty("trade");
    expect(result.keep).toBe("keep");
    expect(result.demographic.keep).toBe("keep");
  });
});

describe("dateToEpochTD", () => {
  it("converts date to epoch string", () => {
    const date = new Date("2024-01-01T00:00:00Z");
    expect(dateToEpochTD(date)).toBe(Math.floor(date.getTime() / 1000).toString());
  });
});

describe("getRegionIdValue", () => {
  it("returns null if no regionId", async () => {
    expect(await getRegionIdValue("")).toBeNull();
  });

  it("returns _id if found", async () => {
    mockCollection.findOne.mockResolvedValue({ _id: "US" });
    expect(await getRegionIdValue("us")).toBe("US");
  });

  it("returns null if not found", async () => {
    mockCollection.findOne.mockResolvedValue(null);
    expect(await getRegionIdValue("xx")).toBeNull();
  });
});

describe("getUserFullData", () => {
  it("throws and logs if getUserData fails", async () => {
    (getUserData as jest.Mock).mockRejectedValue(new Error("not found"));
    await expect(getUserFullData("uuid", "DW", "US", "en")).rejects.toThrow(/Records not found/);
    expect(sendLogToNewRelic).toHaveBeenCalled();
  });

  it("throws and logs if no userPrefs found", async () => {
    (getUserData as jest.Mock).mockResolvedValue({ data: {} });
    mockCollection.aggregate.mockReturnValue({ toArray: () => [] });
    await expect(getUserFullData("uuid", "DW", "US", "en")).rejects.toThrow(/Records not found/);
    expect(sendLogToNewRelic).toHaveBeenCalled();
  });

  it("returns merged user data if found", async () => {
    (getUserData as jest.Mock).mockResolvedValue({
      data: { lastName: "Doe", firstName: "John", MUUID: "muuid", emailVerified: "verified" }
    });
    mockCollection.aggregate.mockReturnValue({ toArray: () => [{ userId: "email", uuid: "uuid" }] });
    const result = await getUserFullData("uuid", "DW", "US", "en");
    expect(result.familyname).toBe("Doe");
    expect(result.givenname).toBe("John");
    expect(result.muuid).toBe("muuid");
    expect(result.emailverified).toBe("verified");
  });
});

describe("mapPreferencesToFields", () => {
  it("maps fields correctly", () => {
    const data = {
      userId: "email",
      uuid: "uuid",
      brandId: "DW",
      regionId: "US",
      marketId: "market",
      language: "en",
      websiteMemberAccountType: "type",
      source: "src",
      company: "Co",
      demographicemploymentStatus: "status",
      tool_usage: "usage",
      demographicTrades: "trade",
      optInProductResearch: true,
      optInProductResearchDate: "2024-01-01T00:00:00Z",
      optOutProductResearchDate: "2024-01-02T00:00:00Z",
      optInNewsletters: true,
      optInNewsletterDate: "2024-01-03T00:00:00Z",
      optOutNewslettersDate: "2024-01-04T00:00:00Z",
      optinConfirmDate: "2024-01-05T00:00:00Z",
      advertisingConsent: true,
      advertisingConsentDate: "2024-01-06T00:00:00Z",
      sms: true,
      smsDate: "2024-01-07T00:00:00Z",
      accountstatus: "active",
      myInterests: "interests",
      jobRoleORFunction: "role",
      familyname: "Doe",
      givenname: "John",
      lastupdatedate: "2024-01-08T00:00:00Z",
      muuid: "muuid",
      emailverified: "2024-01-09 12:34:56.123456 +0000"
    };
    const result = mapPreferencesToFields(data);
    expect(result.email).toBe("email");
    expect(result.aic_uuid).toBe("uuid");
    expect(result.brand).toBe("DW");
    expect(result.region).toBe("US");
    expect(result.market).toBe("market");
    expect(result.preferred_language).toBe("en");
    expect(result.websitememberaccounttype).toBe("type");
    expect(result.source).toBe("src");
    expect(result.company).toBe("Co");
    expect(result.employment_status).toBe("status");
    expect(result.tool_usage).toBe("usage");
    expect(result.my_trade).toBe("trade");
    expect(result.opt_in_marketing_product_research).toBe(true);
    expect(result.optinproductresearchdate).toBe(dateToEpochTD(new Date(data.optInProductResearchDate)));
    expect(result.optoutproductresearchdate).toBe(dateToEpochTD(new Date(data.optOutProductResearchDate)));
    expect(result.optinnewsletters).toBe(true);
    expect(result.optinnewslettersdate).toBe(dateToEpochTD(new Date(data.optInNewsletterDate)));
    expect(result.optoutnewslettersdate).toBe(dateToEpochTD(new Date(data.optOutNewslettersDate)));
    expect(result.optinconfirmationdate).toBe(dateToEpochTD(new Date(data.optinConfirmDate)));
    expect(result.advertisingconsent).toBe(true);
    expect(result.advertisingconsentdate).toBe(dateToEpochTD(new Date(data.advertisingConsentDate)));
    expect(result.sms).toBe(true);
    expect(result.smsdate).toBe(dateToEpochTD(new Date(data.smsDate)));
    expect(result.status).toBe("active");
    expect(result.myinterests).toBe("interests");
    expect(result.jobrole).toBe("role");
    expect(result.familyname).toBe("Doe");
    expect(result.givenname).toBe("John");
    expect(result.lastupdateddate).toBe("2024-01-08T00:00:00Z");
    expect(result.muuid).toBe("muuid");
    expect(result.emailverified).toBe(parseYYYYMMDD_HHMMSS_TO_TD(data.emailverified));
  });

  it("handles missing/undefined fields", () => {
    const result = mapPreferencesToFields({});
    expect(result.email).toBeNull();
    expect(result.aic_uuid).toBeNull();
    expect(result.optinproductresearchdate).toBeNull();
    expect(result.emailverified).toBeNull();
  });
});

describe('formatUptime', () => {
  it('should format uptime correctly for less than a day', () => {
    expect(formatUptime(3661)).toBe('0d 1h 1m 1s'); // 1 hour, 1 minute, 1 second
  });

  it('should format uptime correctly for multiple days', () => {
    expect(formatUptime(90061)).toBe('1d 1h 1m 1s'); // 1 day, 1 hour, 1 minute, 1 second
  });

  it('should format uptime for zero seconds', () => {
    expect(formatUptime(0)).toBe('0d 0h 0m 0s');
  });

  it('should format uptime for exactly one day', () => {
    expect(formatUptime(86400)).toBe('1d 0h 0m 0s');
  });
});

describe('formatMemory', () => {
  it('should format bytes to MB if less than 1 GB', () => {
    expect(formatMemory(1048576)).toBe('1.00 MB'); // 1 MB
    expect(formatMemory(52428800)).toBe('50.00 MB'); // 50 MB
  });

  it('should format bytes to GB if 1 GB or more', () => {
    expect(formatMemory(1073741824)).toBe('1.00 GB'); // 1 GB
    expect(formatMemory(2147483648)).toBe('2.00 GB'); // 2 GB
  });

  it('should format small values correctly', () => {
    expect(formatMemory(0)).toBe('0.00 MB');
    expect(formatMemory(512)).toBe('0.00 MB');
  });
});