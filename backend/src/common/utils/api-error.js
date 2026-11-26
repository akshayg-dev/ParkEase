class ApiError extends Error {
  constructor(statusCode, message, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', data = null) {
    return new ApiError(400, message, data);
  }

  static unauthorized(message = 'Unauthorized', data = null) {
    return new ApiError(401, message, data);
  }

  static forbidden(message = 'Forbidden', data = null) {
    return new ApiError(403, message, data);
  }

  static notFound(message = 'Not found', data = null) {
    return new ApiError(404, message, data);
  }

  static conflict(message = 'Conflict', data = null) {
    return new ApiError(409, message, data);
  }
}

export default ApiError;
