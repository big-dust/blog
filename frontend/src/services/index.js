export { default as httpClient, AuthManager, APIError } from './api';
export { default as articleService } from './articleService';
export { default as categoryService } from './categoryService';
export { default as tagService } from './tagService';
export { default as commentService } from './commentService';
export { default as authService } from './authService';
export { default as uploadService } from './uploadService';
export { default as searchService } from './searchService';

// 简单的错误处理
export const errorHandler = {
  handleAPIError(err) {
    if (err.status === 401) return '请先登录';
    if (err.status === 403) return '没有权限';
    if (err.status === 404) return '找不到';
    if (err.status === 500) return '服务器出错了';
    return err.message || '出错了';
  },
  showError(err) {
    const msg = this.handleAPIError(err);
    console.log('Error:', err);
    alert(msg);
    return msg;
  }
};
