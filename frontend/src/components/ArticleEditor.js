import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFormSubmit } from '../hooks/useAPI';
import { articleService, categoryService, tagService, uploadService } from '../services';
import './ArticleEditor.css';

function ArticleEditor({ editingArticle, onSave, onCancel }) {
  const { isAuthenticated } = useAuth();
  const [article, setArticle] = useState({
    title: '', content: '', summary: '', categoryId: '', tags: []
  });
  const [categories, setCategories] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [filteredTags, setFilteredTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // 加载分类和标签
  useEffect(() => {
    const loadData = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([
          categoryService.getCategories(),
          tagService.getTags()
        ]);
        setCategories(catRes.data || []);
        setAvailableTags(tagRes.data || []);
      } catch (e) {
        console.log('加载分类标签失败');
      }
    };
    loadData();
  }, []);

  // 编辑模式下填充数据
  useEffect(() => {
    if (editingArticle) {
      let tags = [];
      if (editingArticle.tag_ids && editingArticle.tags) {
        tags = editingArticle.tag_ids.map((id, i) => ({
          id: parseInt(id),
          name: editingArticle.tags[i],
          color: '#007bff'
        }));
      }
      setArticle({
        title: editingArticle.title || '',
        content: editingArticle.content || '',
        summary: editingArticle.summary || '',
        categoryId: editingArticle.category_id || '',
        tags
      });
    } else {
      setArticle({ title: '', content: '', summary: '', categoryId: '', tags: [] });
    }
  }, [editingArticle]);

  const { loading: saving, error: saveError, submit } = useFormSubmit(
    async (data) => {
      if (editingArticle) {
        return articleService.updateArticle(editingArticle.id, data);
      }
      return articleService.createArticle(data);
    },
    {
      onSuccess: (result) => {
        alert(editingArticle ? '更新成功！' : '创建成功！');
        if (onSave) onSave(result);
        if (!editingArticle) {
          setArticle({ title: '', content: '', summary: '', categoryId: '', tags: [] });
        }
      },
      onError: (e) => alert(`保存失败: ${e.message}`)
    }
  );

  const handleChange = (field, value) => {
    setArticle(prev => ({ ...prev, [field]: value }));
  };

  const handleTagInputChange = (value) => {
    setTagInput(value);
    if (value.trim()) {
      const filtered = availableTags.filter(t =>
        t.name.toLowerCase().includes(value.toLowerCase()) &&
        !article.tags.find(at => at.id === t.id)
      );
      setFilteredTags(filtered);
      setShowTagSuggestions(true);
    } else {
      setFilteredTags([]);
      setShowTagSuggestions(false);
    }
  };

  const handleTagSelect = (tag) => {
    setArticle(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleTagRemove = (tag) => {
    setArticle(prev => ({ ...prev, tags: prev.tags.filter(t => t.id !== tag.id) }));
  };

  // 创建新标签
  const handleCreateNewTag = async () => {
    const name = tagInput.trim();
    if (!name) return;
    if (availableTags.find(t => t.name.toLowerCase() === name.toLowerCase())) {
      alert('标签已存在');
      return;
    }
    try {
      const res = await tagService.createTag({ name, color: '#007bff' });
      if (res.success && res.data) {
        const newTag = res.data;
        setTagInput('');
        setShowTagSuggestions(false);
        setAvailableTags(prev => [...prev, newTag]);
        setArticle(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      }
    } catch (e) {
      alert('创建标签失败');
    }
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length > 0) handleTagSelect(filteredTags[0]);
      else if (tagInput.trim()) handleCreateNewTag();
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
      setTagInput('');
    }
  };

  // 上传图片
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const result = await uploadService.uploadImage(file, {
        onProgress: (p) => setUploadProgress(p)
      });
      const md = `![${file.name}](${result.data.url})`;
      const textarea = e.target.closest('.form-group').querySelector('textarea');
      const pos = textarea.selectionStart;
      const before = article.content.substring(0, pos);
      const after = article.content.substring(pos);
      // 上传函数不仅上传，还修改内容
      setArticle(prev => ({ ...prev, content: before + md + after }));
      alert('上传成功了');
    } catch (err) {
      alert('上传失败');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { alert('请先登录'); return; }
    if (!article.title.trim() || !article.content.trim()) {
      alert('请填写标题和内容');
      return;
    }
    await submit({
      title: article.title.trim(),
      content: article.content.trim(),
      summary: article.summary.trim(),
      category_id: article.categoryId || null,
      tag_ids: article.tags.map(t => t.id)
    });
  };

  return (
    <div className="article-editor">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">标题 *</label>
          <input
            id="title"
            type="text"
            value={article.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="输入标题..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="summary">摘要</label>
          <textarea
            id="summary"
            value={article.summary}
            onChange={(e) => handleChange('summary', e.target.value)}
            placeholder="输入摘要..."
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">分类</label>
            <select
              id="category"
              value={article.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
            >
              <option value="">选择分类</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>标签</label>
            <div className="tag-input-container">
              <div className="selected-tags">
                {article.tags.map(t => (
                  <span key={t.id} className="selected-tag" style={{ backgroundColor: '#007bff' }}>
                    {t.name}
                    <button type="button" className="remove-tag" onClick={() => handleTagRemove(t)}>×</button>
                  </span>
                ))}
              </div>






              <div className="tag-input-wrapper">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => handleTagInputChange(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  onFocus={() => tagInput && setShowTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 300)}
                  placeholder="搜索已有或创建标签"
                  className="tag-input"
                />
                {showTagSuggestions && (filteredTags.length > 0) && (
                  <div className="tag-suggestions">
                    {filteredTags.map(t => (
                      <div key={t.id} className="tag-suggestion" onClick={() => handleTagSelect(t)}>
                        <span className="tag-preview" style={{ backgroundColor: '#007bff' }}>{t.name}</span>
                      </div>
                    ))}
                    {tagInput.trim() && !filteredTags.find(t => t.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                      <div className="tag-suggestion create-new" onClick={handleCreateNewTag}>
                        <span className="create-tag-text">+ 创建: "{tagInput.trim()}"</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="content">内容 *</label>
          <div className="content-editor">
            <div className="editor-toolbar">
              <label className="upload-button">
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} style={{ display: 'none' }} />
                {isUploading ? `上传中....... ${uploadProgress}%` : '上传图片'}
              </label>
            </div>
            <textarea
              id="content"
              value={article.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="输入内容（支持Markdown）..."
              rows="15"
              required
            />
          </div>
        </div>

        {saveError && <div className="error-message">保存失败: {saveError}</div>}

        <div className="form-actions">
          <button type="submit" className="save-button" disabled={saving || isUploading}>
            {saving ? '保存中...' : (editingArticle ? '更新' : '保存')}
          </button>
          {onCancel && (
            <button type="button" className="cancel-button" onClick={onCancel}>取消</button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ArticleEditor;
