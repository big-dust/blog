const jwt = require('jsonwebtoken');

/**
 * JWT 认证中间件
 * 验证请求头中的 JWT 令牌
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: {
        code: 'MISSING_TOKEN',
        message: '访问令牌缺失',
        timestamp: new Date().toISOString()
      }
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      let errorMessage = '令牌无效';
      let errorCode = 'INVALID_TOKEN';
      
      if (err.name === 'TokenExpiredError') {
        errorMessage = '令牌已过期';
        errorCode = 'TOKEN_EXPIRED';
      } else if (err.name === 'JsonWebTokenError') {
        errorMessage = '令牌格式错误';
        errorCode = 'MALFORMED_TOKEN';
      }
      
      return res.status(403).json({
        error: {
          code: errorCode,
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // 将用户信息添加到请求对象
    req.user = decoded;
    next();
  });
};

/**
 * 生成 JWT 令牌
 * @param {Object} payload - 令牌载荷
 * @param {string} expiresIn - 过期时间
 * @returns {string} JWT 令牌
 */
const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * 验证 JWT 令牌
 * @param {string} token - JWT 令牌
 * @returns {Object|null} 解码后的载荷或 null
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  generateToken,
  verifyToken
};