interface ApiErrorResponse {
    statusCode: number;
    message: string;
    errorCode?: string;
    requestId?: string;
    invalidFields?: Record<string, string[]>;
  }
  
  export function handleApiError(error: any, defaultMessage: string = "An unexpected error occurred", statusCode?: number): ApiErrorResponse {
    // Case 1: API Responded with an Error
    if (error.response) {
      const { status, data } = error.response;
  
      // If the response has "stat: error" format, map it correctly
      if (data?.stat === "error") {
        return {
          statusCode: statusCode || status || 400, // Default to 400 if no status is provided
          message: data?.message || data?.error_description || defaultMessage,
          errorCode: data?.error || "UNKNOWN_ERROR",
          requestId: data?.request_id || undefined,
          invalidFields: data?.invalid_fields || undefined
        };
      }
  
      return {
        statusCode: statusCode || status || 400,
        message: data?.message || defaultMessage,
        errorCode: "API_ERROR",
        requestId: undefined,
        invalidFields: undefined
      };
    }
    if (error?.stat === "error") {
          return {
            statusCode: statusCode || 400, // Default to 400 if no status is provided
            message: error?.message || error?.error_description || defaultMessage,
            errorCode: error?.error || "UNKNOWN_ERROR",
            requestId: error?.request_id || undefined,
            invalidFields: error?.invalid_fields || undefined
          };
        }
    if (error.errors) {
      return {
        statusCode: statusCode || 400,
        message: error?.errors[0].message || defaultMessage,
        errorCode: error.error,
        requestId: undefined,
      };
    }
    
    if (error.error) {
      return {
        statusCode: statusCode || 400,
        message: error?.error.message || error?.error.error_description || defaultMessage,
        errorCode: error?.error.error ||"INVALID_INPUT",
        requestId: undefined,
        invalidFields: error?.error?.invalid_fields || undefined
      }
    }

    if (error.stat) {
      return {
        statusCode: statusCode || 400,
        message: error?.error_description || defaultMessage,
        errorCode: error.error,
        requestId: undefined,
        invalidFields: error.invalid_fields || undefined
      };
    }


    if (error.name === 'Error') {
      return {
        statusCode: statusCode || 400,
        message: error.message,
        errorCode: "INVALID_INPUT",
        requestId: undefined,
        invalidFields: error.invalid_fields || undefined
      };
    }
  
    // Case 2: Network Issues (No Response from API)
    if (error.request) {
      return {
        statusCode: 503,
        message: "No response from API. Check network connectivity.",
        errorCode: "NO_RESPONSE",
        requestId: undefined,
        invalidFields: undefined
      };
    }
  
    // Case 3: Unexpected Errors (Syntax, Logic Issues)
    return {
      statusCode: 500,
      message: error.message || defaultMessage,
      errorCode: "INTERNAL_SERVER_ERROR",
      requestId: undefined,
      invalidFields: undefined
    };
  }