const fc = require('fast-check');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { pool } = require('../config/database');
const { generateToken, verifyToken, authenticateToken } = require('../middleware/auth');

// 辅助函数：执行数据库查询
const query = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

// 辅助函数：清理测试数据
const cleanupTestData = async () => {
  await query('DELETE FROM users WHERE username LIKE ?', ['test_auth_%']);
};

// 辅助函数：创建测试用户
const createTestUser = async (username, email, password) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    [username, email, passwordHash]
  );
  return result.insertId;
};

// 辅助函数：验证用户凭证
const validateCredentials = async (username, password) => {
  const users = await query(
    'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
    [username, username]
  );
  
  if (users.length === 0) {
    return null;
  }
  
  const user = users[0];
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  
  if (!isValidPassword) {
    return null;
  }
  
  return {
    id: user.id,
    username: user.username,
    email: user.email
  };
};

/**
 * **Feature: personal-blog, Property 19: JWT 认证完整性**
 * **Validates: Requirements 6.2**
 * 
 * 对于任何有效的登录凭证，系统应当生成有效的 JWT 令牌；对于无效凭证，应当拒绝认证
 */
describe('JWT 认证完整性测试', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  test('属性测试：有效凭证应当生成有效令牌，无效凭证应当被拒绝', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成测试用户数据
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 10 }).map(s => `test_auth_${s.replace(/[^a-zA-Z0-9]/g, '')}`),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 6, maxLength: 20 }),
          wrongPassword: fc.string({ minLength: 6, maxLength: 20 })
        }).filter(data => data.password !== data.wrongPassword), // 确保错误密码不同
        
        async (userData) => {
          try {
            // 创建测试用户
            const userId = await createTestUser(userData.username, userData.email, userData.password);
            expect(userId).toBeGreaterThan(0);
            
            // 测试有效凭证 - 使用用户名
            const validUserByUsername = await validateCredentials(userData.username, userData.password);
            expect(validUserByUsername).not.toBeNull();
            expect(validUserByUsername.id).toBe(userId);
            expect(validUserByUsername.username).toBe(userData.username);
            expect(validUserByUsername.email).toBe(userData.email);
            
            // 生成 JWT 令牌
            const token = generateToken({
              id: validUserByUsername.id,
              username: validUserByUsername.username,
              email: validUserByUsername.email
            });
            
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
            
            // 验证生成的令牌
            const decodedToken = verifyToken(token);
            expect(decodedToken).not.toBeNull();
            expect(decodedToken.id).toBe(validUserByUsername.id);
            expect(decodedToken.username).toBe(validUserByUsername.username);
            expect(decodedToken.email).toBe(validUserByUsername.email);
            
            // 测试有效凭证 - 使用邮箱
            const validUserByEmail = await validateCredentials(userData.email, userData.password);
            expect(validUserByEmail).not.toBeNull();
            expect(validUserByEmail.id).toBe(userId);
            
            // ��试无效凭证 - 错误密码
            const invalidUserWrongPassword = await validateCredentials(userData.username, userData.wrongPassword);
            expect(invalidUserWrongPassword).toBeNull();
            
            // 测试无效凭证 - 不存在的用户名
            const nonExistentUsername = `nonexistent_${userData.username}`;
            const invalidUserNotFound = await validateCredentials(nonExistentUsername, userData.password);
            expect(invalidUserNotFound).toBeNull();
            
            // 测试无效令牌
            const invalidToken = 'invalid.jwt.token';
            const decodedInvalidToken = verifyToken(invalidToken);
            expect(decodedInvalidToken).toBeNull();
            
            // 测试篡改的令牌
            const tamperedToken = token.slice(0, -5) + 'xxxxx';
            const decodedTamperedToken = verifyToken(tamperedToken);
            expect(decodedTamperedToken).toBeNull();
            
          } catch (error) {
            // 清理可能的部分数据
            await cleanupTestData();
            throw error;
          }
        }
      ),
      { numRuns: 20 } // 运行20次测试以减少执行时间
    );
  }, 30000); // 增加超时时间到30秒

  test('单元测试：JWT 令牌生成和验证基础功能', async () => {
    const testPayload = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    };
    
    // 测试令牌生成
    const token = generateToken(testPayload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT 应该有三个部分
    
    // 测试令牌验证
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded.id).toBe(testPayload.id);
    expect(decoded.username).toBe(testPayload.username);
    expect(decoded.email).toBe(testPayload.email);
    expect(decoded).toHaveProperty('iat'); // 应该有签发时间
    expect(decoded).toHaveProperty('exp'); // 应该有过期时间
  });

  test('单元测试：密码哈希和验证', async () => {
    const password = 'testpassword123';
    const wrongPassword = 'wrongpassword456';
    
    // 测试密码哈希
    const hash = await bcrypt.hash(password, 10);
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe(password); // 哈希值不应该等于原密码
    
    // 测试正确密码验证
    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);
    
    // 测试错误密码验证
    const isInvalid = await bcrypt.compare(wrongPassword, hash);
    expect(isInvalid).toBe(false);
  });

  test('单元测试：令牌过期处理', async () => {
    const testPayload = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    };
    
    // 生成一个立即过期的令牌
    const expiredToken = generateToken(testPayload, '0s');
    
    // 等待一小段时间确保令牌过期
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 验证过期令牌应该返回 null
    const decoded = verifyToken(expiredToken);
    expect(decoded).toBeNull();
  });
});

/**
 * **Feature: personal-blog, Property 20: 授权验证一致性**
 * **Validates: Requirements 6.3**
 * 
 * 对于任何管理操作，只有携带有效 JWT 令牌的请求应当被允许执行
 */
describe('授权验证一致性测试', () => {
  test('属性测试：只有有效令牌应当通过授权验证', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成测试数据
        fc.record({
          validUser: fc.record({
            id: fc.integer({ min: 1, max: 9999 }),
            username: fc.string({ minLength: 3, maxLength: 10 }).map(s => `test_auth_${s.replace(/[^a-zA-Z0-9]/g, '')}`),
            email: fc.emailAddress()
          }),
          invalidTokens: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 5 })
        }),
        
        async (testData) => {
          try {
            const { validUser, invalidTokens } = testData;
            
            // 生成有效令牌
            const validToken = generateToken(validUser);
            expect(typeof validToken).toBe('string');
            
            // 测试有效令牌验证
            const decodedValid = verifyToken(validToken);
            expect(decodedValid).not.toBeNull();
            expect(decodedValid.id).toBe(validUser.id);
            expect(decodedValid.username).toBe(validUser.username);
            expect(decodedValid.email).toBe(validUser.email);
            
            // 测试无效令牌验证
            for (const invalidToken of invalidTokens) {
              const decodedInvalid = verifyToken(invalidToken);
              expect(decodedInvalid).toBeNull();
            }
            
            // 测试空令牌
            const decodedNull = verifyToken(null);
            expect(decodedNull).toBeNull();
            
            const decodedUndefined = verifyToken(undefined);
            expect(decodedUndefined).toBeNull();
            
            const decodedEmpty = verifyToken('');
            expect(decodedEmpty).toBeNull();
            
            // 测试格式错误的令牌
            const malformedTokens = [
              'not.a.jwt',
              'header.payload', // 缺少签名
              'header.payload.signature.extra', // 多余部分
              'Bearer validtoken', // 包含Bearer前缀
              validToken.replace(/[a-zA-Z]/g, 'X') // 篡改的令牌
            ];
            
            for (const malformedToken of malformedTokens) {
              const decodedMalformed = verifyToken(malformedToken);
              expect(decodedMalformed).toBeNull();
            }
            
            // 测试过期令牌
            const expiredToken = generateToken(validUser, '0s');
            await new Promise(resolve => setTimeout(resolve, 100)); // 等待过期
            const decodedExpired = verifyToken(expiredToken);
            expect(decodedExpired).toBeNull();
            
          } catch (error) {
            throw error;
          }
        }
      ),
      { numRuns: 20 } // 运行20次测试
    );
  }, 30000); // 30秒超时

  test('单元测试：授权中间件模拟测试', () => {
    // 模拟请求和响应对象
    const createMockReq = (authHeader) => ({
      headers: { authorization: authHeader }
    });
    
    const createMockRes = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };
    
    const mockNext = jest.fn();
    
    // 测试缺少令牌
    const reqNoToken = createMockReq();
    const resNoToken = createMockRes();
    
    authenticateToken(reqNoToken, resNoToken, mockNext);
    
    expect(resNoToken.status).toHaveBeenCalledWith(401);
    expect(resNoToken.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'MISSING_TOKEN',
          message: '访问令牌缺失'
        })
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
    
    // 测试无效令牌
    const reqInvalidToken = createMockReq('Bearer invalid.token.here');
    const resInvalidToken = createMockRes();
    mockNext.mockClear();
    
    authenticateToken(reqInvalidToken, resInvalidToken, mockNext);
    
    expect(resInvalidToken.status).toHaveBeenCalledWith(403);
    expect(resInvalidToken.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: expect.stringMatching(/INVALID_TOKEN|MALFORMED_TOKEN/)
        })
      })
    );
    expect(mockNext).not.toHaveBeenCalled();
    
    // 测试有效令牌
    const validUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    const validToken = generateToken(validUser);
    const reqValidToken = createMockReq(`Bearer ${validToken}`);
    const resValidToken = createMockRes();
    mockNext.mockClear();
    
    authenticateToken(reqValidToken, resValidToken, mockNext);
    
    expect(resValidToken.status).not.toHaveBeenCalled();
    expect(resValidToken.json).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(reqValidToken.user).toBeDefined();
    expect(reqValidToken.user.id).toBe(validUser.id);
    expect(reqValidToken.user.username).toBe(validUser.username);
    expect(reqValidToken.user.email).toBe(validUser.email);
  });
});

// 全局清理
afterAll(async () => {
  await cleanupTestData();
  await pool.end();
});