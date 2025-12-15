const { db } = require('../config/database');

const checkInitialData = async () => {
  try {
    console.log('检查初始测试数据...');
    
    // 检查用户数据
    const users = await db.query('SELECT id, username, email FROM users');
    
    console.log('\n用户数据:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, 用户名: ${user.username}, 邮箱: ${user.email}`);
    });
    
    // 检查分类数据
    const categories = await db.query('SELECT id, name, description FROM categories');
    
    console.log('\n分类数据:');
    categories.forEach(category => {
      console.log(`- ID: ${category.id}, 名称: ${category.name}, 描述: ${category.description}`);
    });
    
    // 检查标签数据
    const tags = await db.query('SELECT id, name, color FROM tags');
    
    console.log('\n标签数据:');
    tags.forEach(tag => {
      console.log(`- ID: ${tag.id}, 名称: ${tag.name}, 颜色: ${tag.color}`);
    });
    
    // 检查文章数据
    const articles = await db.query(`
      SELECT 
        a.id, 
        a.title, 
        a.view_count, 
        a.created_at,
        u.username as author_name
      FROM articles a
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.created_at DESC
    `);
    
    console.log('\n文章数据:');
    articles.forEach(article => {
      console.log(`- ID: ${article.id}, 标题: ${article.title}, 作者: ${article.author_name || '未知'}, 浏览: ${article.view_count}, 创建时间: ${article.created_at}`);
    });
    
    await db.close();
    console.log('\n初始数据检查完成！');
    
  } catch (error) {
    console.error('数据检查失败:', error.message);
    process.exit(1);
  }
};

checkInitialData();