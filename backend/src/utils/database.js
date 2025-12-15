const { db } = require('../config/database');

// 数据库工具类
class DatabaseUtils {
  
  // 检查表存不存在
  static async tableExists(tableName) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
        [process.env.DB_NAME || 'personal_blog', tableName]
      );
      return result[0].count > 0;
    } catch (e) {
      console.log(`检查表 ${tableName} 出错:`, e.message);
      return false;
    }
  }

  // 获取表行数
  static async getTableRowCount(tableName) {
    try {
      const result = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      return result[0].count;
    } catch (e) {
      return 0;
    }
  }

  // 分页查询
  static async paginate(baseQuery, params = [], page = 1, limit = 10) {
    try {
      // 先查总数
      const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as t`;
      const countResult = await db.query(countQuery, params);
      const total = countResult[0].total;

      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);

      // 查数据
      const dataQuery = `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
      const data = await db.query(dataQuery, params);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (e) {
      console.log('分页查询出错:', e.message);
      throw e;
    }
  }

  // 插入数据
  static async insert(tableName, data) {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = fields.map(() => '?').join(', ');
      
      const sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
      const result = await db.query(sql, values);
      
      return result.insertId;
    } catch (e) {
      console.log(`插入 ${tableName} 出错:`, e.message);
      throw e;
    }
  }

  // 更新数据
  static async update(tableName, data, where) {
    try {
      const setFields = Object.keys(data).map(f => `${f} = ?`).join(', ');
      const whereFields = Object.keys(where).map(f => `${f} = ?`).join(' AND ');
      
      const sql = `UPDATE ${tableName} SET ${setFields} WHERE ${whereFields}`;
      const params = [...Object.values(data), ...Object.values(where)];
      
      const result = await db.query(sql, params);
      return result.affectedRows;
    } catch (e) {
      console.log(`更新 ${tableName} 出错:`, e.message);
      throw e;
    }
  }

  // 删除数据
  static async delete(tableName, where) {
    try {
      const whereFields = Object.keys(where).map(f => `${f} = ?`).join(' AND ');
      const sql = `DELETE FROM ${tableName} WHERE ${whereFields}`;
      const params = Object.values(where);
      
      const result = await db.query(sql, params);
      return result.affectedRows;
    } catch (e) {
      console.log(`删除 ${tableName} 出错:`, e.message);
      throw e;
    }
  }
}

module.exports = DatabaseUtils;
