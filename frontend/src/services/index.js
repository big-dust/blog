// 统一导出所有服务
export { default as httpClient, AuthManager, APIError } from './api';
export { default as articleService } from './articleService';
export { default as categoryService } from './categoryService';
export { default as tagService } from './tagService';
export { default as commentService } from './commentService';
export { default as authService } from './authService';
export { default as uploadService } from './uploadService';
export { default as searchService } from './searchService';

// 错误处理工具
export const errorHandler = {
  // 处理 API 错误
  handleAPIError(error) {
    if (error instanceof APIError) {
      switch (error.status) {
        case 400:
          return '请求参数错误，请检查输入内容';
        case 401:
          return '未授权访问，请重新登录';
        case 403:
          return '权限不足，无法执行此操作';
        case 404:
          return '请求的资源不存在';
        case 422:
          return error.message || '数据验证失败';
        case 500:
          return '服务器内部错误，请稍后重试';
        case 502:
          return '服务暂时不可用，请稍后重试';
        case 503:
          return '服务维护中，请稍后重试';
        default:
          return error.message || '请求失败，请稍后重试';
      }
    }
    
    if (error.message) {
      return error.message;
    }
    
    return '未知错误，请稍后重试';
  },

  // 显示错误消息
  showError(error, fallbackMessage = '操作失败') {
    const message = this.handleAPIError(error);
    
    // 这里可以集成 toast 通知库
    console.error('API Error:', error);
    alert(message); // 临时使用 alert，后续可以替换为更好的 UI
    
    return message;
  }
};

// 请求状态管理工具
export const requestState = {
  // 创建请求状态
  createState() {
    return {
      loading: false,
      error: null,
      data: null
    };
  },

  // 开始请求
  startRequest(state) {
    return {
      ...state,
      loading: true,
      error: null
    };
  },

  // 请求成功
  successRequest(state, data) {
    return {
      ...state,
      loading: false,
      error: null,
      data
    };
  },

  // 请求失败
  errorRequest(state, error) {
    return {
      ...state,
      loading: false,
      error: errorHandler.handleAPIError(error),
      data: null
    };
  }
};