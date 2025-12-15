import { useState, useEffect, useCallback } from 'react';
import { errorHandler } from '../services';

// 通用API请求hook
export function useAPI(apiFn, deps = [], options = {}) {
  const { immediate = true, onSuccess, onError, initialData = null } = options;
  const [state, setState] = useState({ loading: immediate, error: null, data: initialData });

  const execute = useCallback(async (...args) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await apiFn(...args);
      setState({ loading: false, error: null, data: result });
      if (onSuccess) onSuccess(result);
      return result;
    } catch (e) {
      const msg = errorHandler.handleAPIError(e);
      setState({ loading: false, error: msg, data: null });
      if (onError) onError(e);
      throw e;
    }
  }, [apiFn, onSuccess, onError]);

  useEffect(() => {
    if (immediate) execute();
  }, deps);

  return { ...state, execute, refetch: execute };
}

// 分页hook
export function usePaginatedAPI(apiFn, options = {}) {
  const { initialPage = 1, pageSize = 10, ...rest } = options;
  const [page, setPage] = useState(initialPage);
  const [allData, setAllData] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  const { loading, error, data, execute } = useAPI(
    (p = page) => apiFn({ page: p, limit: pageSize }),
    [page],
    {
      immediate: false,
      onSuccess: (result) => {
        if (page === 1) setAllData(result.data || []);
        else setAllData(prev => [...prev, ...(result.data || [])]);
        setHasMore(result.hasMore || false);
        if (rest.onSuccess) rest.onSuccess(result);
      },
      ...rest
    }
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) setPage(p => p + 1);
  }, [loading, hasMore]);

  const refresh = useCallback(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
    execute(1);
  }, [execute]);

  useEffect(() => { execute(page); }, [page, execute]);

  return { loading, error, data: allData, hasMore, currentPage: page, totalPages: data?.totalPages || 1, loadMore, refresh };
}

// 表单提交hook
export function useFormSubmit(submitFn, options = {}) {
  const { onSuccess, onError, resetOnSuccess = false } = options;
  const [state, setState] = useState({ loading: false, error: null, success: false });

  const submit = useCallback(async (formData, resetForm) => {
    setState({ loading: true, error: null, success: false });
    try {
      const result = await submitFn(formData);
      setState({ loading: false, error: null, success: true });
      if (resetOnSuccess && resetForm) resetForm();
      if (onSuccess) onSuccess(result);
      return result;
    } catch (e) {
      const msg = errorHandler.handleAPIError(e);
      setState({ loading: false, error: msg, success: false });
      if (onError) onError(e);
      throw e;
    }
  }, [submitFn, onSuccess, onError, resetOnSuccess]);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, success: false });
  }, []);

  return { ...state, submit, reset };
}

export default useAPI;
