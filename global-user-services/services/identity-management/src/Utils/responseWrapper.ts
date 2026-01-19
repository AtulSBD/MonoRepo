export interface ApiResponse<T = any> {
    statusCode: number;
    message: string;
    data?: T;
    error?: any;
  }
  
  export const successResponse = <T>(message: string, data?: T, statusCode = 200): ApiResponse<T> => ({
    statusCode,
    message,
    data,
  });
  
  export const errorResponse = (message: string, statusCode = 400, error?: any): ApiResponse => ({
    statusCode,
    message,
    error,
  });