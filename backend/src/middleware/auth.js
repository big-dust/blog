const jwt = require('jsonwebtoken');

// 检查token
const checkToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '没有token' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // token过期或者无效
      return res.status(403).json({ error: 'token无效' });
    }
    req.user = decoded;
    next();
  });
};

// 生成token
const makeToken = (data, expiresIn = '24h') => {
  return jwt.sign(data, process.env.JWT_SECRET, { expiresIn });
};

// 验证token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return null;
  }
};

module.exports = {
  authenticateToken: checkToken,  // 保持兼容
  checkToken,
  generateToken: makeToken,
  makeToken,
  verifyToken
};
