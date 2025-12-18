const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { generateToken, verifyToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const [users] = await pool.execute(
      'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const user = users[0];

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成token
    const tokenData = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    const accessToken = generateToken(tokenData, '24h');
    const refreshToken = generateToken({ id: user.id }, '7d');

    res.json({
      message: '登录成功',
      data: {
        user: { id: user.id, username: user.username, email: user.email },
        tokens: { accessToken, refreshToken, expiresIn: '24h' }
      }
    });
  } catch (e) {
    console.log('登录出错:', e.message);
    res.status(500).json({ error: '登录失败' });
  }
});

// 刷新token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: '缺少refreshToken' });
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({ error: 'token无效' });
    }

    const [users] = await pool.execute(
      'SELECT id, username, email FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = users[0];
    const tokenData = { id: user.id, username: user.username, email: user.email };
    const newToken = generateToken(tokenData, '24h');

    res.json({
      message: '刷新成功',
      data: { accessToken: newToken, expiresIn: '24h' }
    });
  } catch (e) {
    console.log('刷新token出错:', e.message);
    res.status(500).json({ error: '刷新失败' });
  }
});

// 验证token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ message: 'token有效', data: { user: req.user } });
});
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ message: '获取成功', data: { user: users[0] } });
  } catch (e) {
    console.log('获取用户信息出错:', e.message);
    res.status(500).json({ error: '获取失败' });
  }
});

module.exports = router;
