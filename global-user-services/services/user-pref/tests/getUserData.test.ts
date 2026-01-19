import axios from "axios";
import { getUserData } from "../src/services/getUserData";
import { uupBaseUrl } from "../src/env";
import { sendLogToNewRelic } from "../newRelicLogger";

// Mock axios and sendLogToNewRelic
jest.mock("axios");
jest.mock("../newRelicLogger", () => ({
  sendLogToNewRelic: jest.fn(),
}));

describe("getUserData", () => {
  const payload = {
    uuid: "test-uuid",
    brandId: "BR1",
    regionId: "RG1",
    locale: "en-US"
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return data on success", async () => {
    const mockResponse = { data: { firstName: "John", lastName: "Doe" } };
    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await getUserData(payload);

    expect(axios.post).toHaveBeenCalledWith(
      `${uupBaseUrl}api/uup/users`,
      {
        id: payload.uuid,
        brandId: payload.brandId,
        regionId: payload.regionId,
        locale: payload.locale
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    expect(result).toEqual(mockResponse.data);
  });

  it("should log and throw error on failure", async () => {
    const mockError = new Error("Request failed");
    (axios.post as jest.Mock).mockRejectedValue(mockError);

    await expect(getUserData(payload)).rejects.toThrow(
      `User not found in AIC with given uuid: ${payload.uuid} - brandId: ${payload.brandId} - regionId: ${payload.regionId} - locale: ${payload.locale}`
    );

    expect((sendLogToNewRelic as jest.Mock)).toHaveBeenCalled();

    // Optionally check the arguments
    const callArgs = (sendLogToNewRelic as jest.Mock).mock.calls[0][0];
    expect(callArgs[0]).toEqual(
      expect.objectContaining({
        message: expect.stringContaining("User not found in AIC"),
        error: mockError,
        logtype: "ERROR",
        service: "uup-nonpii-pref",
        methodType: "GET"
      })
    );
  });
});