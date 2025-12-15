const fc = require('fast-check');
const mysql = require('mysql2');

/**
 * **Feature: personal-blog, Property 8: 级联删除完整性**
 * **Validates: Requirements 2.3**
 * 
 * 对于任何文章删除操作，该文章及其所有关联的评论和标签关系应当从数据库中完全移除
 */

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'root',
  database: 'personal_blog',
  charset: 'utf8mb4'
};

let connection;

beforeAll(() => {
  connection = mysql.createConnection(dbConfig);
});

afterAll(() => {
  if (connection) {
    connection.end();
  }
});

// 辅助函数：执行查询
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// 辅助函数：清理测试数据
const cleanupTestData = async () => {
  await query('DELETE FROM comments WHERE article_id > 1000');
  await query('DELETE FROM article_tags WHERE article_id > 1000');
  await query('DELETE FROM articles WHERE id > 1000');
  await query('DELETE FROM tags WHERE id > 1000');
  await query('DELETE FROM categories WHERE id > 1000');
  await query('DELETE FROM users WHERE id > 1000');
};

// 辅助函数：创建测试用户（如果不存在）
const createTestUser = async (userId) => {
  await query(
    'INSERT IGNORE INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)',
    [userId, `testuser${userId}`, `test${userId}@example.com`, 'hashedpassword']
  );
  return userId;
};

// 辅助函数：创建测试分类（如果不存在）
const createTestCategory = async (categoryId) => {
  await query(
    'INSERT IGNORE INTO categories (id, name, description) VALUES (?, ?, ?)',
    [categoryId, `测试分类${categoryId}`, `测试分类描述${categoryId}`]
  );
  return categoryId;
};

// 辅助函数：创建测试标签（如果不存在）
const createTestTag = async (tagId) => {
  await query(
    'INSERT IGNORE INTO tags (id, name, color) VALUES (?, ?, ?)',
    [tagId, `测试标签${tagId}`, '#ff0000']
  );
  return tagId;
};

// 辅助函数：创建测试文章
const createTestArticle = async (articleId, authorId, categoryId) => {
  await query(
    'INSERT INTO articles (id, title, content, author_id, category_id) VALUES (?, ?, ?, ?, ?)',
    [articleId, `测试文章${articleId}`, `测试内容${articleId}`, authorId, categoryId]
  );
  return articleId;
};

// 辅助函数：创建文章标签关联（如果不存在）
const createArticleTagRelation = async (articleId, tagId) => {
  await query(
    'INSERT IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)',
    [articleId, tagId]
  );
};

// 辅助函数：创建测试评论
const createTestComment = async (commentId, articleId, parentId = null) => {
  await query(
    'INSERT INTO comments (id, article_id, parent_id, nickname, email, content) VALUES (?, ?, ?, ?, ?, ?)',
    [commentId, articleId, parentId, `测试用户${commentId}`, `test${commentId}@example.com`, `测试评论${commentId}`]
  );
  return commentId;
};

// 辅助函数：检查记录是否存在
const recordExists = async (table, idField, id) => {
  const results = await query(`SELECT COUNT(*) as count FROM ${table} WHERE ${idField} = ?`, [id]);
  return results[0].count > 0;
};

describe('级联删除完整性测试', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  test('属性测试：删除文章应当级联删除所有相关数据', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成测试数据：文章ID、用户ID、分类ID、标签ID数组、评论ID数组
        fc.integer({ min: 1001, max: 9999 }), // articleId
        fc.integer({ min: 1001, max: 9999 }), // authorId  
        fc.integer({ min: 1001, max: 9999 }), // categoryId
        fc.uniqueArray(fc.integer({ min: 1001, max: 9999 }), { minLength: 1, maxLength: 3 }), // tagIds
        fc.uniqueArray(fc.integer({ min: 1001, max: 9999 }), { minLength: 1, maxLength: 5 }), // commentIds
        
        async (articleId, authorId, categoryId, tagIds, commentIds) => {
          try {
            // 创建测试数据
            await createTestUser(authorId);
            await createTestCategory(categoryId);
            await createTestArticle(articleId, authorId, categoryId);
            
            // 创建标签和关联
            for (const tagId of tagIds) {
              await createTestTag(tagId);
              await createArticleTagRelation(articleId, tagId);
            }
            
            // 创建评论（包括嵌套评论）
            for (let i = 0; i < commentIds.length; i++) {
              const commentId = commentIds[i];
              const parentId = i > 0 && Math.random() > 0.5 ? commentIds[i - 1] : null;
              await createTestComment(commentId, articleId, parentId);
            }
            
            // 验证数据存在
            expect(await recordExists('articles', 'id', articleId)).toBe(true);
            
            // 验证标签关联存在
            for (const tagId of tagIds) {
              const relations = await query(
                'SELECT COUNT(*) as count FROM article_tags WHERE article_id = ? AND tag_id = ?',
                [articleId, tagId]
              );
              expect(relations[0].count).toBe(1);
            }
            
            // 验证评论存在
            for (const commentId of commentIds) {
              expect(await recordExists('comments', 'id', commentId)).toBe(true);
            }
            
            // 执行删除操作
            await query('DELETE FROM articles WHERE id = ?', [articleId]);
            
            // 验证文章已被删除
            expect(await recordExists('articles', 'id', articleId)).toBe(false);
            
            // 验证所有标签关联已被级联删除
            for (const tagId of tagIds) {
              const relations = await query(
                'SELECT COUNT(*) as count FROM article_tags WHERE article_id = ?',
                [articleId]
              );
              expect(relations[0].count).toBe(0);
            }
            
            // 验证所有评论已被级联删除
            const remainingComments = await query(
              'SELECT COUNT(*) as count FROM comments WHERE article_id = ?',
              [articleId]
            );
            expect(remainingComments[0].count).toBe(0);
            
            // 验证标签本身仍然存在（只删除关联，不删除标签）
            for (const tagId of tagIds) {
              expect(await recordExists('tags', 'id', tagId)).toBe(true);
            }
            
          } catch (error) {
            // 清理可能的部分数据
            await cleanupTestData();
            throw error;
          }
        }
      ),
      { numRuns: 100 } // 运行100次测试
    );
  });
});