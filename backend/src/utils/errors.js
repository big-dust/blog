// 错误处理工具
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleError = (err, req, res, next) => {
  const { statusCode = 500, message } = err;

  res.status(statusCode).json({
    error: {
      message,
      timestamp: new Date().toISOString(),
      path: req.path
    }
  });
};

module.exports = {
  AppError,
  handleError
};