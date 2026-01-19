import mongoose from "mongoose";
import { getOrCreateMuuid, dateToEpochTD, APP_IDS } from "../src/utils/userPrefHelper";

// Mock the collection and its methods
const findOneAndUpdateMock = jest.fn();

const collectionMock = jest.fn().mockReturnValue({
  findOneAndUpdate: findOneAndUpdateMock,
});

beforeAll(() => {
  // @ts-ignore
  mongoose.connection.collection = collectionMock;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("getOrCreateMuuid", () => {
  it("should create a new MUUID if not exists", async () => {
    // Simulate MongoDB returning a document after upsert
    const fakeMUUID = "abcdef1234567890abcdef12";
    findOneAndUpdateMock.mockResolvedValue({ MUUID: fakeMUUID });

    const userId = "user123";
    const result = await getOrCreateMuuid(userId);

    expect(collectionMock).toHaveBeenCalledWith(expect.any(String));
    expect(findOneAndUpdateMock).toHaveBeenCalledWith(
      { userId },
      expect.objectContaining({ $set: expect.objectContaining({ userId }) }),
      expect.objectContaining({ upsert: true, returnDocument: "after" })
    );
    expect(result).toBe(fakeMUUID);
  });

  it("should throw an error if result is null", async () => {
    findOneAndUpdateMock.mockResolvedValue(null);

    await expect(getOrCreateMuuid("user123")).rejects.toThrow("Failed to find or create MUUID");
  });

  it("should throw and log error if exception occurs", async () => {
    const error = new Error("DB error");
    findOneAndUpdateMock.mockRejectedValue(error);

    // Spy on console.log
    const logSpy = jest.spyOn(console, "log").mockImplementation();

    await expect(getOrCreateMuuid("user123")).rejects.toThrow("DB error");
    expect(logSpy).toHaveBeenCalledWith("Failed to find or create MUUID", error);

    logSpy.mockRestore();
  });
});

describe("dateToEpochTD", () => {
  it("should convert date to epoch seconds as string", () => {
    const date = new Date("2024-01-01T00:00:00Z");
    const expected = Math.floor(date.getTime() / 1000).toString();
    expect(dateToEpochTD(date)).toBe(expected);
  });
});

describe("APP_IDS", () => {
  it("should have correct app ids", () => {
    expect(APP_IDS).toEqual({ AIC: "AIC", TD: "TD" });
  });
});