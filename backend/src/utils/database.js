const { db } = require('../config/database');

/**
 * 数据库工具函数
 */
class DatabaseUtils {
  
  /**
   * 检查表是否存在
   * @param {string} tableName 表名
   * @returns {boolean} 表是否存在
   */
  static async tableExists(tableName) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
        [process.env.DB_NAME || 'personal_blog', tableName]
      );
      return result[0].count > 0;
    } catch (error) {
      console.error(`检查表 ${tableName} 是否存在时出错:`, error.message);
      return false;
    }
  }

  /**
   * 获取表的行数
   * @param {string} tableName 表名
   * @returns {number} 行数
   */
  static async getTableRowCount(tableName) {
    try {
      const result = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      return result[0].count;
    } catch (error) {
      console.error(`获取表 ${tableName} 行数时出错:`, error.message);
      return 0;
    }
  }

  /**
   * 执行分页查询
   * @param {string} baseQuery 基础查询语句
   * @param {Array} params 查询参数
   * @param {number} page 页码 (从1开始)
   * @param {number} limit 每页数量
   * @returns {Object} 分页结果
   */
  static async paginate(baseQuery, params = [], page = 1, limit = 10) {
    try {
      // 计算总数
      const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as count_table`;
      const countResult = await db.query(countQuery, params);
      const total = countResult[0].total;

      // 计算分页参数
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);

      // 执行分页查询
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
    } catch (error) {
      console.error('分页查询出错:', error.message);
      throw error;
    }
  }

  /**
   * 安全地插入数据并返回插入的ID
   * @param {string} tableName 表名
   * @param {Object} data 要插入的数据
   * @returns {number} 插入的ID
   */
  static async insert(tableName, data) {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      const placeholders = fields.map(() => '?').join(', ');
      
      const query = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
      const result = await db.query(query, values);
      
      return result.insertId;
    } catch (error) {
      console.error(`插入数据到表 ${tableName} 时出错:`, error.message);
      throw error;
    }
  }

  /**
   * 安全地更新数据
   * @param {string} tableName 表名
   * @param {Object} data 要更新的数据
   * @param {Object} where 更新条件
   * @returns {number} 受影响的行数
   */
  static async update(tableName, data, where) {
    try {
      const setFields = Object.keys(data).map(field => `${field} = ?`).join(', ');
      const whereFields = Object.keys(where).map(field => `${field} = ?`).join(' AND ');
      
      const query = `UPDATE ${tableName} SET ${setFields} WHERE ${whereFields}`;
      const params = [...Object.values(data), ...Object.values(where)];
      
      const result = await db.query(query, params);
      return result.affectedRows;
    } catch (error) {
      console.error(`更新表 ${tableName} 数据时出错:`, error.message);
      throw error;
    }
  }

  /**
   * 安全地删除数据
   * @param {string} tableName 表名
   * @param {Object} where 删除条件
   * @returns {number} 受影响的行数
   */
  static async delete(tableName, where) {
    try {
      const whereFields = Object.keys(where).map(field => `${field} = ?`).join(' AND ');
      const query = `DELETE FROM ${tableName} WHERE ${whereFields}`;
      const params = Object.values(where);
      
      const result = await db.query(query, params);
      return result.affectedRows;
    } catch (error) {
      console.error(`删除表 ${tableName} 数据时出错:`, error.message);
      throw error;
    }
  }
}

module.exports = DatabaseUtils;