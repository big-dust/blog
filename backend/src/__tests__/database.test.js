const { db, dbConfig } = require('../config/database');
const DatabaseUtils = require('../utils/database');

describe('Database Connection Tests', () => {
  
  describe('Database Manager', () => {
    test('should successfully connect to database', async () => {
      const isConnected = await db.testConnection();
      expect(isConnected).toBe(true);
      expect(db.isConnected).toBe(true);
    });

    test('should execute simple query successfully', async () => {
      const result = await db.query('SELECT 1 as test');
      expect(result).toBeDefined();
      expect(result[0].test).toBe(1);
    });

    test('should handle query with parameters', async () => {
      const testValue = 'test_value';
      const result = await db.query('SELECT ? as test_param', [testValue]);
      expect(result[0].test_param).toBe(testValue);
    });

    test('should return pool status information', () => {
      const status = db.getPoolStatus();
      expect(status).toHaveProperty('connectionLimit');
      expect(status).toHaveProperty('isConnected');
      expect(typeof status.connectionLimit).toBe('number');
      expect(typeof status.isConnected).toBe('boolean');
    });

    test('should handle transaction successfully', async () => {
      // 使用一个简单的事务测试
      const result = await db.transaction(async (connection) => {
        const [rows] = await connection.execute('SELECT 1 as transaction_test');
        return rows[0].transaction_test;
      });
      
      expect(result).toBe(1);
    });
  });

  describe('Database Configuration', () => {
    test('should have valid database configuration', () => {
      expect(dbConfig).toBeDefined();
      expect(dbConfig.host).toBeDefined();
      expect(dbConfig.port).toBeDefined();
      expect(dbConfig.user).toBeDefined();
      expect(dbConfig.database).toBeDefined();
      expect(dbConfig.charset).toBe('utf8mb4');
    });

    test('should use correct database name', () => {
      expect(dbConfig.database).toBe('personal_blog');
    });
  });

  describe('Database Utils', () => {
    test('should check if table exists', async () => {
      // 检查 users 表是否存在（应该存在）
      const usersExists = await DatabaseUtils.tableExists('users');
      expect(typeof usersExists).toBe('boolean');
      
      // 检查不存在的表
      const fakeTableExists = await DatabaseUtils.tableExists('non_existent_table');
      expect(fakeTableExists).toBe(false);
    });

    test('should get table row count', async () => {
      // 获取 users 表的行数
      const count = await DatabaseUtils.getTableRowCount('users');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should handle pagination correctly', async () => {
      // 测试分页功能
      const baseQuery = 'SELECT id, username FROM users';
      const result = await DatabaseUtils.paginate(baseQuery, [], 1, 5);
      
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('page');
      expect(result.pagination).toHaveProperty('limit');
      expect(result.pagination).toHaveProperty('total');
      expect(result.pagination).toHaveProperty('totalPages');
      expect(result.pagination).toHaveProperty('hasNext');
      expect(result.pagination).toHaveProperty('hasPrev');
      
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(5);
      expect(typeof result.pagination.total).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid SQL query gracefully', async () => {
      await expect(db.query('INVALID SQL QUERY')).rejects.toThrow();
    });

    test('should handle query with invalid parameters', async () => {
      await expect(db.query('SELECT * FROM non_existent_table')).rejects.toThrow();
    });

    test('should identify connection errors correctly', () => {
      const connectionError = { code: 'PROTOCOL_CONNECTION_LOST', message: 'Connection lost' };
      const normalError = { code: 'ER_SYNTAX_ERROR', message: 'Syntax error' };
      
      expect(db.isConnectionError(connectionError)).toBe(true);
      expect(db.isConnectionError(normalError)).toBe(false);
    });
  });

  describe('Database Operations', () => {
    let testUserId;

    test('should insert data successfully', async () => {
      const testData = {
        username: `test_user_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password_hash: 'test_hash'
      };

      testUserId = await DatabaseUtils.insert('users', testData);
      expect(typeof testUserId).toBe('number');
      expect(testUserId).toBeGreaterThan(0);
    });

    test('should update data successfully', async () => {
      if (!testUserId) {
        // 如果没有测试用户ID，跳过此测试
        return;
      }

      const updateData = {
        email: `updated_${Date.now()}@example.com`
      };
      const whereCondition = { id: testUserId };

      const affectedRows = await DatabaseUtils.update('users', updateData, whereCondition);
      expect(affectedRows).toBe(1);
    });

    test('should delete data successfully', async () => {
      if (!testUserId) {
        // 如果没有测试用户ID，跳过此测试
        return;
      }

      const whereCondition = { id: testUserId };
      const affectedRows = await DatabaseUtils.delete('users', whereCondition);
      expect(affectedRows).toBe(1);
    });
  });

  // 清理测试
  afterAll(async () => {
    // 清理可能残留的测试数据
    try {
      await db.query('DELETE FROM users WHERE username LIKE ?', ['test_user_%']);
    } catch (error) {
      // 忽略清理错误
    }
    
    // 关闭数据库连接
    await db.close();
  });
});