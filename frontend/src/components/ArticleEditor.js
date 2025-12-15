import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFormSubmit } from '../hooks/useAPI';
import { articleService, categoryService, tagService, uploadService } from '../services';
import './ArticleEditor.css';

function ArticleEditor({ editingArticle, onSave, onCancel }) {
  const { isAuthenticated } = useAuth();
  const [article, setArticle] = useState({
    title: '',
    content: '',
    summary: '',
    categoryId: '',
    tags: []
  });
  const [categories, setCategories] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [filteredTags, setFilteredTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Load categories and tags on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          categoryService.getCategories(),
          tagService.getTags()
        ]);
        setCategories(categoriesRes.data || []);
        setAvailableTags(tagsRes.data || []);
      } catch (error) {
        console.error('Failed to load categories and tags:', error);
      }
    };

    loadData();
  }, []);

  // Set article data when editing - 只在 editingArticle 变化时执行
  useEffect(() => {
    if (editingArticle) {
      // 处理标签数据 - 后端返回的可能是字符串数组，需要转换为对象数组
      let articleTags = [];
      if (editingArticle.tag_ids && editingArticle.tags) {
        const tagIds = editingArticle.tag_ids;
        const tagNames = editingArticle.tags;
        
        articleTags = tagIds.map((id, index) => {
          const tagId = parseInt(id);
          const tagName = tagNames[index];
          
          return {
            id: tagId,
            name: tagName,
            color: '#007bff' // 默认颜色，后续会从 availableTags 更新
          };
        });
      }

      setArticle({
        title: editingArticle.title || '',
        content: editingArticle.content || '',
        summary: editingArticle.summary || '',
        categoryId: editingArticle.category_id || '',
        tags: articleTags
      });
    } else {
      // 重置表单为新建文章状态
      setArticle({
        title: '',
        content: '',
        summary: '',
        categoryId: '',
        tags: []
      });
    }
    // 注意：只依赖 editingArticle，避免更新标签列表时重置文章状态
  }, [editingArticle]);



  // Form submission hook
  const { loading: saving, error: saveError, submit } = useFormSubmit(
    async (formData) => {
      if (editingArticle) {
        return articleService.updateArticle(editingArticle.id, formData);
      } else {
        return articleService.createArticle(formData);
      }
    },
    {
      onSuccess: (result) => {
        alert(editingArticle ? '文章更新成功！' : '文章创建成功！');
        if (onSave) {
          onSave(result);
        }
        if (!editingArticle) {
          // Reset form for new articles
          setArticle({
            title: '',
            content: '',
            summary: '',
            categoryId: '',
            tags: []
          });
        }
      },
      onError: (error) => {
        alert(`保存失败: ${error.message}`);
      }
    }
  );

  const handleInputChange = (field, value) => {
    setArticle(prev => ({ ...prev, [field]: value }));
  };



  const handleTagInputChange = (value) => {
    setTagInput(value);
    console.log('Tag input changed:', value);
    console.log('Available tags:', availableTags);
    if (value.trim()) {
      const filtered = availableTags.filter(tag => 
        tag.name.toLowerCase().includes(value.toLowerCase()) &&
        !article.tags.find(t => t.id === tag.id)
      );
      console.log('Filtered tags:', filtered);
      setFilteredTags(filtered);
      setShowTagSuggestions(true);
    } else {
      setFilteredTags([]);
      setShowTagSuggestions(false);
    }
  };

  const handleTagSelect = (tag) => {
    setArticle(prev => ({
      ...prev,
      tags: [...prev.tags, tag]
    }));
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleTagRemove = (tagToRemove) => {
    setArticle(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t.id !== tagToRemove.id)
    }));
  };

  const handleCreateNewTag = async () => {
    const tagName = tagInput.trim();
    if (!tagName) return;

    // 防止重复创建
    if (availableTags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase())) {
      alert('标签已存在');
      return;
    }

    try {
      const response = await tagService.createTag({
        name: tagName,
        color: '#007bff'
      });
      
      if (response.success && response.data) {
        const newTag = response.data;
        
        // 立即清理输入状态
        setTagInput('');
        setShowTagSuggestions(false);
        setFilteredTags([]);
        
        // 更新可用标签列表
        setAvailableTags(prevTags => [...prevTags, newTag]);
        
        // 添加到文章标签
        setArticle(prevArticle => ({
          ...prevArticle,
          tags: [...prevArticle.tags, newTag]
        }));
        
        // 延迟显示成功消息，避免阻塞 UI 更新
        setTimeout(() => {
          alert('新标签创建成功！');
        }, 100);
      } else {
        throw new Error('标签创建响应格式错误');
      }
    } catch (error) {
      console.error('创建标签失败:', error);
      alert(`创建标签失败: ${error.message}`);
    }
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTags.length > 0) {
        handleTagSelect(filteredTags[0]);
      } else if (tagInput.trim()) {
        handleCreateNewTag();
      }
    } else if (e.key === 'Escape') {
      setShowTagSuggestions(false);
      setTagInput('');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadService.uploadImage(file, {
        onProgress: (progress) => {
          setUploadProgress(progress);
        }
      });

      // Insert image markdown into content at cursor position
      const imageMarkdown = `![${file.name}](${result.data.url})`;
      const textarea = event.target.closest('.form-group').querySelector('textarea');
      const cursorPos = textarea.selectionStart;
      const textBefore = article.content.substring(0, cursorPos);
      const textAfter = article.content.substring(cursorPos);
      
      setArticle(prev => ({
        ...prev,
        content: textBefore + imageMarkdown + textAfter
      }));

      alert('图片上传成功！');
    } catch (error) {
      alert(`图片上传失败: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      event.target.value = ''; // Reset file input
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('请先登录');
      return;
    }

    if (!article.title.trim() || !article.content.trim()) {
      alert('请填写标题和内容');
      return;
    }

    const formData = {
      title: article.title.trim(),
      content: article.content.trim(),
      summary: article.summary.trim(),
      category_id: article.categoryId || null,
      tag_ids: article.tags.map(tag => tag.id)
    };

    await submit(formData);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Reset form
      setArticle({
        title: '',
        content: '',
        summary: '',
        categoryId: '',
        tags: []
      });
    }
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
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="输入文章标题..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="summary">摘要</label>
          <textarea
            id="summary"
            value={article.summary}
            onChange={(e) => handleInputChange('summary', e.target.value)}
            placeholder="输入文章摘要..."
            rows="3"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">分类</label>
            <select
              id="category"
              value={article.categoryId}
              onChange={(e) => handleInputChange('categoryId', e.target.value)}
            >
              <option value="">选择分类</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>标签</label>
            <div className="tag-input-container">
              <div className="selected-tags">
                {article.tags.map(tag => (
                  <span key={tag.id} className="selected-tag" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                    <button
                      type="button"
                      className="remove-tag"
                      onClick={() => handleTagRemove(tag)}
                    >
                      ×
                    </button>
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
                  placeholder="搜索或创建标签..."
                  className="tag-input"
                />
                {showTagSuggestions && (tagInput.trim() || filteredTags.length > 0) && (
                  <div className="tag-suggestions">
                    {/* 显示匹配的标签 */}
                    {filteredTags.map(tag => (
                      <div
                        key={tag.id}
                        className="tag-suggestion"
                        onClick={() => handleTagSelect(tag)}
                      >
                        <span className="tag-preview" style={{ backgroundColor: tag.color }}>
                          {tag.name}
                        </span>
                      </div>
                    ))}
                    {/* 只有当输入不完全匹配任何已有标签时，才显示创建新标签选项 */}
                    {tagInput.trim() && !filteredTags.find(tag => tag.name.toLowerCase() === tagInput.trim().toLowerCase()) && (
                      <div
                        className="tag-suggestion create-new"
                        onClick={handleCreateNewTag}
                      >
                        <span className="create-tag-text">
                          + 创建新标签: "{tagInput.trim()}"
                        </span>
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
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                />
                {isUploading ? `上传中... ${uploadProgress}%` : '上传图片'}
              </label>
            </div>
            <textarea
              id="content"
              value={article.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="输入文章内容（支持 Markdown）..."
              rows="15"
              required
            />
          </div>
        </div>

        {saveError && (
          <div className="error-message">
            保存失败: {saveError}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="save-button" disabled={saving || isUploading}>
            {saving ? '保存中...' : (editingArticle ? '更新文章' : '保存文章')}
          </button>
          {onCancel && (
            <button type="button" className="cancel-button" onClick={handleCancel}>
              取消
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default ArticleEditor;