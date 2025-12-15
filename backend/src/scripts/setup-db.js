const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const { createAdmin } = require('./create-admin');

// 数据库设置脚本
const setupDatabase = async () => {
  try {
    // 首先连接到 MySQL 服务器（不指定数据库）
    const connection = mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'root'
    });

    console.log('正在连接到 MySQL 服务器...');
    
    // 读取并执行 SQL 脚本
    const sqlScript = fs.readFileSync(
      path.join(__dirname, '../../database/init.sql'), 
      'utf8'
    );

    // 分割 SQL 语句并执行
    const statements = sqlScript.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await new Promise((resolve, reject) => {
          connection.query(statement, (err, results) => {
            if (err) {
              console.error('SQL 执行错误:', err.message);
              reject(err);
            } else {
              resolve(results);
            }
          });
        });
      }
    }

    console.log('数据库初始化完成！');
    connection.end();
    
    // 创建管理员用户
    console.log('正在创建管理员用户...');
    await createAdmin();
    
  } catch (error) {
    console.error('数据库设置失败:', error.message);
    process.exit(1);
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;