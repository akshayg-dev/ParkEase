const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  if (statusCode === 500) {
    console.error(err);
  }

  const payload = {
    success: false,
    message: statusCode === 500 ? 'Internal server error' : err.message,
  };

  if (statusCode !== 500 && err.data !== null && err.data !== undefined) {
    payload.data = err.data;
  }

  res.status(statusCode).json(payload);
};

export default errorHandler;
