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

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 数据库管理
class DatabaseManager {
  constructor() {
    this.pool = pool;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
  }

  async testConnection() {
    try {
      const conn = await this.pool.getConnection();
      await conn.ping();
      conn.release();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('数据库连接成功');
      return true;
    } catch (e) {
      this.isConnected = false;
      console.log('数据库连接失败:', e.message);
      return false;
    }
  }

  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (e) {
      console.log('查询出错:', e.message);
      // console.log('SQL:', sql);  // 调试用
      if (this.isConnectionError(e)) {
        await this.handleConnectionError();
      }
      throw e;
    }
  }

  async transaction(callback) {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await callback(conn);
      await conn.commit();
      return result;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  isConnectionError(err) {
    const codes = [
      'PROTOCOL_CONNECTION_LOST',
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND'
    ];
    return codes.includes(err.code) || 
           (err.message && err.message.includes('Connection lost'));
  }

  async handleConnectionError() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('重连次数太多了，不试了');
      return;
    }
    this.reconnectAttempts++;
    console.log(`重连中... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    await new Promise(r => setTimeout(r, this.reconnectDelay));
    const ok = await this.testConnection();
    if (!ok && this.reconnectAttempts < this.maxReconnectAttempts) {
      await this.handleConnectionError();
    }
  }

  getPoolStatus() {
    return {
      connectionLimit: 10,
      isConnected: this.isConnected
    };
  }

  async close() {
    try {
      await this.pool.end();
      console.log('数据库关闭了');
    } catch (e) {
      console.log('关闭数据库出错:', e.message);
    }
  }
}

const db = new DatabaseManager();

const initDatabase = async () => {
  try {
    await db.testConnection();
    
    process.on('SIGINT', async () => {
      await db.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await db.close();
      process.exit(0);
    });
  } catch (e) {
    console.log('数据库初始化失败:', e.message);
    process.exit(1);
  }
};

module.exports = {
  db,
  pool,
  dbConfig,
  initDatabase
};
