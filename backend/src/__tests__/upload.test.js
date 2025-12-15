const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const uploadRoutes = require('../routes/upload');
const { generateToken } = require('../middleware/auth');

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/upload', uploadRoutes);

// 测试用的 JWT 令牌
const testToken = generateToken({ id: 1, username: 'admin' });

describe('图片上传接口测试', () => {
  const testImagePath = path.join(__dirname, 'test-image.jpg');
  const uploadDir = path.join(__dirname, '../../uploads/images');

  beforeAll(() => {
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 创建测试图片文件
    const testImageBuffer = Buffer.from('fake-image-data');
    fs.writeFileSync(testImagePath, testImageBuffer);
  });

  afterAll(() => {
    // 清理测试文件
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
    // 清理上传的测试文件
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      files.forEach(file => {
        if (file.includes('test')) {
          fs.unlinkSync(path.join(uploadDir, file));
        }
      });
    }
  });

  test('应该拒绝未认证的上传请求', async () => {
    const response = await request(app)
      .post('/api/upload/image')
      .attach('image', testImagePath);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });

  test('应该拒绝没有文件的请求', async () => {
    const response = await request(app)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('NO_FILE');
  });

  test('应该成功上传图片文件', async () => {
    const response = await request(app)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${testToken}`)
      .attach('image', testImagePath);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('filename');
    expect(response.body.data).toHaveProperty('url');
    expect(response.body.data.originalName).toBe('test-image.jpg');
  });

  test('应该能获取上传的图片列表', async () => {
    const response = await request(app)
      .get('/api/upload/images')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('应该拒绝未认证的图片列表请求', async () => {
    const response = await request(app)
      .get('/api/upload/images');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('MISSING_TOKEN');
  });
});