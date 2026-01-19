import axios from "axios";
import { callGraphQL } from "../src/Utils/graphQlHelper";
import { sendLogToNewRelic } from "../src/Utils/newRelicLogger";

// Mock axios and sendLogToNewRelic
jest.mock("axios");
jest.mock("../src/Utils/newRelicLogger");

jest.mock('../src/env', () => ({
  graphqlURLGPR: 'http://sbd-glsdev.americas.swk.pri/gpr-dev/graphql'
}));


const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSendLogToNewRelic = sendLogToNewRelic as jest.Mock;

describe("callGraphQL", () => {
  const query = "{ testQuery }";
  const variables = { id: 1 };
  const GRAPHQL_URL = "http://sbd-glsdev.americas.swk.pri/gpr-dev/graphql";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return data on success", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { data: { result: "success" } }
    });

    const result = await callGraphQL(query, variables);

    expect(result).toEqual({ result: "success" });
    expect(mockedSendLogToNewRelic).not.toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      { query, variables },
      { headers: { 'Content-Type': 'application/json' } }
    );
  });

  it("should log and return data when GraphQL errors are present", async () => {
    const errors = [{ message: "GraphQL error" }];
    mockedAxios.post.mockResolvedValueOnce({
      data: { data: null, errors }
    });

    const result = await callGraphQL(query, variables);

    expect(result).toBeNull();
    expect(mockedSendLogToNewRelic).toHaveBeenCalledWith(
      [expect.objectContaining({
        message: "error while sending data to gpr",
        error: errors,
        logtype: "ERROR",
        service: "uup",
        endpoint: "register",
        // timestamp: expect.any(Number), // Optionally check timestamp
      })]
    );
  });

  it("should log when axios throws", async () => {
    const error = new Error("Network error");
    mockedAxios.post.mockRejectedValueOnce(error);

    const result = await callGraphQL(query, variables);

    expect(result).toBeUndefined();
    expect(mockedSendLogToNewRelic).toHaveBeenCalledWith(
      [expect.objectContaining({
        message: "error while sending data to gpr",
        error,
        logtype: "ERROR",
        service: "uup",
        endpoint: "register",
        // timestamp: expect.any(Number), // Optionally check timestamp
      })]
    );
  });
});