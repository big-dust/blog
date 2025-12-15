const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateToken, verifyToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * 管理员登录
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 输入验证
    if (!username || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '用户名和密码不能为空',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 查询用户
    const [users] = await pool.execute(
      'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '用户名或密码错误',
          timestamp: new Date().toISOString()
        }
      });
    }

    const user = users[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '用户名或密码错误',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 生成 JWT 令牌
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    const accessToken = generateToken(tokenPayload, '24h');
    const refreshToken = generateToken({ id: user.id }, '7d');

    // 返回成功响应
    res.json({
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: '24h'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '登录过程中发生错误',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * 刷新 JWT 令牌
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: '刷新令牌缺失',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 验证刷新令牌
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: '刷新令牌无效或已过期',
          timestamp: new Date().toISOString()
        }
      });
    }

    // 获取用户信息
    const [users] = await pool.execute(
      'SELECT id, username, email FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    const user = users[0];

    // 生成新的访问令牌
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    const newAccessToken = generateToken(tokenPayload, '24h');

    res.json({
      message: '令牌刷新成功',
      data: {
        accessToken: newAccessToken,
        expiresIn: '24h'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('令牌刷新错误:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '令牌刷新过程中发生错误',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * 验证令牌状态
 * GET /api/auth/verify
 */
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    message: '令牌有效',
    data: {
      user: req.user
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      message: '获取用户信息成功',
      data: {
        user: users[0]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '获取用户信息过程中发生错误',
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;