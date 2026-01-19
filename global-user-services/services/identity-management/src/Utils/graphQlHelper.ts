import axios from "axios";
import { sendLogToNewRelic } from "./newRelicLogger";
import { graphqlURLGPR } from "../env";

export async function callGraphQL(query: any, variables: any) {
  try {
    const response = await axios.post(graphqlURLGPR,
      {
        query,
        variables,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const result = response.data;
    if (result.errors) {
      sendLogToNewRelic([{
        message: "error while sending data to gpr",
        error: result.errors,
        timestamp: Date.now(),
        logtype: "ERROR",
        service: "uup",
        endpoint: "register",
      }]);
    }
    return result.data;
  } catch (error) {
    sendLogToNewRelic([{
      message: "error while sending data to gpr",
      error,
      timestamp: Date.now(),
      logtype: "ERROR",
      service: "uup",
      endpoint: "register",
    }]);
  }
}