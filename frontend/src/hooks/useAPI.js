import { useState, useEffect, useCallback } from 'react';
import { requestState, errorHandler } from '../services';

// 通用 API 请求 Hook
export function useAPI(apiFunction, dependencies = [], options = {}) {
  const {
    immediate = true,
    onSuccess,
    onError,
    initialData = null
  } = options;

  const [state, setState] = useState({
    loading: immediate,
    error: null,
    data: initialData
  });

  const execute = useCallback(async (...args) => {
    setState(prev => requestState.startRequest(prev));

    try {
      const result = await apiFunction(...args);
      setState(prev => requestState.successRequest(prev, result));
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = errorHandler.handleAPIError(error);
      setState(prev => requestState.errorRequest(prev, error));
      
      if (onError) {
        onError(error);
      } else {
        console.error('API Error:', error);
      }
      
      throw error;
    }
  }, [apiFunction, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies);

  return {
    ...state,
    execute,
    refetch: execute
  };
}

// 分页数据 Hook
export function usePaginatedAPI(apiFunction, options = {}) {
  const {
    initialPage = 1,
    pageSize = 10,
    ...restOptions
  } = options;

  const [page, setPage] = useState(initialPage);
  const [allData, setAllData] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  const {
    loading,
    error,
    data,
    execute
  } = useAPI(
    (currentPage = page) => apiFunction({ page: currentPage, limit: pageSize }),
    [page],
    {
      immediate: false,
      onSuccess: (result) => {
        if (page === 1) {
          setAllData(result.data || []);
        } else {
          setAllData(prev => [...prev, ...(result.data || [])]);
        }
        
        setHasMore(result.hasMore || false);
        
        if (restOptions.onSuccess) {
          restOptions.onSuccess(result);
        }
      },
      ...restOptions
    }
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const refresh = useCallback(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
    execute(1);
  }, [execute]);

  useEffect(() => {
    execute(page);
  }, [page, execute]);

  return {
    loading,
    error,
    data: allData,
    hasMore,
    currentPage: page,
    totalPages: data?.totalPages || 1,
    loadMore,
    refresh
  };
}

// 表单提交 Hook
export function useFormSubmit(submitFunction, options = {}) {
  const {
    onSuccess,
    onError,
    resetOnSuccess = false
  } = options;

  const [state, setState] = useState({
    loading: false,
    error: null,
    success: false
  });

  const submit = useCallback(async (formData, resetForm) => {
    setState(prev => ({ ...prev, loading: true, error: null, success: false }));

    try {
      const result = await submitFunction(formData);
      setState(prev => ({ ...prev, loading: false, success: true }));
      
      if (resetOnSuccess && resetForm) {
        resetForm();
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      const errorMessage = errorHandler.handleAPIError(error);
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    }
  }, [submitFunction, onSuccess, onError, resetOnSuccess]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, success: false });
  }, []);

  return {
    ...state,
    submit,
    reset
  };
}

export default useAPI;