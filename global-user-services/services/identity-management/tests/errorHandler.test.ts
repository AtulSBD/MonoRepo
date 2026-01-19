
import { handleApiError } from '../src/Utils/errorHandler';

describe('handleApiError', () => {
  const defaultMessage = 'An unexpected error occurred';

  it('should handle error.response with stat=error', () => {
    const error = {
      response: {
        status: 400,
        data: {
          stat: 'error',
          message: 'Invalid request',
          error: 'INVALID_REQUEST',
          request_id: 'req123',
          invalid_fields: { email: ['Invalid format'] }
        }
      }
    };
    const result = handleApiError(error);
    expect(result).toEqual({
      statusCode: 400,
      message: 'Invalid request',
      errorCode: 'INVALID_REQUEST',
      requestId: 'req123',
      invalidFields: { email: ['Invalid format'] }
    });
  });

  it('should handle error.response without stat=error', () => {
    const error = {
      response: {
        status: 401,
        data: {
          message: 'Unauthorized'
        }
      }
    };
    const result = handleApiError(error);
    expect(result).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
      errorCode: 'API_ERROR',
      requestId: undefined,
      invalidFields: undefined
    });
  });

  it('should handle error with stat=error directly', () => {
    const error = {
      stat: 'error',
      message: 'Bad input',
      error: 'BAD_INPUT',
      request_id: 'req456',
      invalid_fields: { name: ['Required'] }
    };
    const result = handleApiError(error);
    expect(result).toEqual({
      statusCode: 400,
      message: 'Bad input',
      errorCode: 'BAD_INPUT',
      requestId: 'req456',
      invalidFields: { name: ['Required'] }
    });
  });

  it('should handle error.errors array', () => {
    const error = {
      errors: [{ message: 'Validation failed' }],
      error: 'VALIDATION_ERROR'
    };
    const result = handleApiError(error);
    expect(result).toEqual({
      statusCode: 400,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      requestId: undefined
    });
  });

  it('should handle error.error object', () => {
    const error = {
      error: { message: 'Invalid input' }
    };
    const result = handleApiError(error);
    expect(result).toEqual({
      statusCode: 400,
      message: 'Invalid input',
      errorCode: 'INVALID_INPUT',
      requestId: undefined
    });
  });

  it('should handle error.stat without response', () => {
    const error = {
      stat: 'error',
      error_description: 'Missing fields',
      error: 'MISSING_FIELDS',
      invalid_fields: { password: ['Too short'] }
    };
    const result = handleApiError(error);
    expect(result).toEqual({
      statusCode: 400,
      message: 'Missing fields',
      errorCode: 'MISSING_FIELDS',
      requestId: undefined,
      invalidFields: { password: ['Too short'] }
    });
  });

  it('should handle error.name === "Error"', () => {
    const error = {
      name: 'Error',
      message: 'Something went wrong',
      invalid_fields: { username: ['Taken'] }
    };
    const result = handleApiError(error);
    expect(result).toEqual({
      statusCode: 400,
      message: 'Something went wrong',
      errorCode: 'INVALID_INPUT',
      requestId: undefined,
      invalidFields: { username: ['Taken'] }
    });
  });

  it('should handle error.request (network issue)', () => {
    const error = {
      request: {}
    };
    const result = handleApiError(error);
    expect(result).toEqual({
      statusCode: 503,
      message: 'No response from API. Check network connectivity.',
      errorCode: 'NO_RESPONSE',
      requestId: undefined,
      invalidFields: undefined
    });
  });

  it('should handle unexpected error', () => {
    const error = {
      message: 'Unexpected failure'
    };
    const result = handleApiError(error);
    expect(result).toEqual({
      statusCode: 500,
      message: 'Unexpected failure',
      errorCode: 'INTERNAL_SERVER_ERROR',
      requestId: undefined,
      invalidFields: undefined
    });
  });
});
