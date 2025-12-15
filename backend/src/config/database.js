const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'personal_blog',
  charset: 'utf8mb4',
  timezone: '+08:00'
};

// 创建连接池
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 数据库连接管理类
class DatabaseManager {
  constructor() {
    this.pool = pool;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5秒
  }

  // 测试数据库连接
  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('数据库连接成功');
      return true;
    } catch (error) {
      this.isConnected = false;
      console.error('数据库连接失败:', error.message);
      return false;
    }
  }

  // 执行查询
  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('数据库查询错误:', error.message);
      console.error('SQL:', sql);
      console.error('参数:', params);
      
      // 如果是连接错误，尝试重连
      if (this.isConnectionError(error)) {
        await this.handleConnectionError();
      }
      
      throw error;
    }
  }

  // 执行事务
  async transaction(callback) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 判断是否为连接错误
  isConnectionError(error) {
    const connectionErrorCodes = [
      'PROTOCOL_CONNECTION_LOST',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND'
    ];
    
    return connectionErrorCodes.includes(error.code) || 
           (error.message && error.message.includes('Connection lost')) ||
           (error.message && error.message.includes('connect ECONNREFUSED'));
  }

  // 处理连接错误
  async handleConnectionError() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连');
      return;
    }

    this.reconnectAttempts++;
    console.log(`尝试重连数据库 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
    
    const connected = await this.testConnection();
    if (!connected && this.reconnectAttempts < this.maxReconnectAttempts) {
      await this.handleConnectionError();
    }
  }

  // 获取连接池状态
  getPoolStatus() {
    return {
      connectionLimit: 10, // 固定值，因为我们在创建池时设置的
      isConnected: this.isConnected
    };
  }

  // 关闭连接池
  async close() {
    try {
      await this.pool.end();
      console.log('数据库连接池已关闭');
    } catch (error) {
      console.error('关闭数据库连接池时出错:', error.message);
    }
  }
}

// 创建数据库管理器实例
const db = new DatabaseManager();

// 初始化数据库连接
const initDatabase = async () => {
  try {
    await db.testConnection();
    
    // 监听进程退出事件，优雅关闭连接
    process.on('SIGINT', async () => {
      console.log('收到 SIGINT 信号，正在关闭数据库连接...');
      await db.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('收到 SIGTERM 信号，正在关闭数据库连接...');
      await db.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    process.exit(1);
  }
};

module.exports = {
  db,
  pool,
  dbConfig,
  initDatabase
};