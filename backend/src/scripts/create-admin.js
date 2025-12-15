const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

/**
 * 创建管理员用户脚本
 */
async function createAdmin() {
  try {
    const connection = await pool.getConnection();
    
    // 默认管理员信息
    const adminData = {
      username: 'admin',
      email: 'admin@blog.com',
      password: 'admin123' // 默认密码，生产环境应该修改
    };
    
    // 生成密码哈希
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminData.password, saltRounds);
    
    // 插入或更新管理员用户
    await connection.execute(`
      INSERT INTO users (username, email, password_hash) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
        email = VALUES(email),
        password_hash = VALUES(password_hash),
        updated_at = CURRENT_TIMESTAMP
    `, [adminData.username, adminData.email, passwordHash]);
    
    console.log('管理员用户创建/更新成功:');
    console.log(`用户名: ${adminData.username}`);
    console.log(`邮箱: ${adminData.email}`);
    console.log(`密码: ${adminData.password}`);
    console.log('请在生产环境中修改默认密码！');
    
    connection.release();
    
  } catch (error) {
    console.error('创建管理员用户失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  createAdmin();
}

module.exports = { createAdmin };