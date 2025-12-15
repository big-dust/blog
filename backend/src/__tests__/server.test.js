const request = require('supertest');
const express = require('express');

// 简单的服务器测试
describe('Server', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.get('/', (req, res) => {
      res.json({ message: '个人博客 API 服务器运行中' });
    });
  });

  test('should respond to GET /', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('个人博客 API 服务器运行中');
  });
});