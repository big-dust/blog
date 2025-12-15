// 自定义错误类
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// 错误处理中间件
const handleError = (err, req, res, next) => {
  const code = err.statusCode || 500;
  res.status(code).json({ error: err.message || '服务器错误' });
};

module.exports = {
  AppError,
  handleError
};
