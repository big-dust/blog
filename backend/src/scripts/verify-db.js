const { connection } = require('../config/database');

const verifyDatabase = async () => {
  try {
    console.log('验证数据库结构...');
    
    // 检查所有表
    const tables = await new Promise((resolve, reject) => {
      connection.query('SHOW TABLES', (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    console.log('数据库表:');
    tables.forEach(table => {
      console.log(`- ${Object.values(table)[0]}`);
    });
    
    // 检查外键约束
    const constraints = await new Promise((resolve, reject) => {
      connection.query(`
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          CONSTRAINT_NAME,
          REFERENCED_TABLE_NAME,
          REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = 'personal_blog'
      `, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    console.log('\n外键约束:');
    constraints.forEach(constraint => {
      console.log(`- ${constraint.TABLE_NAME}.${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
    });
    
    // 检查索引
    const indexes = await new Promise((resolve, reject) => {
      connection.query(`
        SELECT 
          TABLE_NAME,
          INDEX_NAME,
          COLUMN_NAME,
          INDEX_TYPE
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = 'personal_blog'
        ORDER BY TABLE_NAME, INDEX_NAME
      `, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    console.log('\n索引:');
    indexes.forEach(index => {
      console.log(`- ${index.TABLE_NAME}.${index.INDEX_NAME} (${index.INDEX_TYPE}): ${index.COLUMN_NAME}`);
    });
    
    connection.end();
    console.log('\n数据库验证完成！');
    
  } catch (error) {
    console.error('数据库验证失败:', error.message);
    process.exit(1);
  }
};

verifyDatabase();