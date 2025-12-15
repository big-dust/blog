const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${randomNum}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器：只允许图片文件
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (JPEG, PNG, GIF, WebP)'), false);
  }
};

// 配置 multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 限制
    files: 1 // 一次只能上传一个文件
  }
});

// 上传图片接口 (需要认证)
router.post('/image', authenticateToken, (req, res) => {
  const uploadSingle = upload.single('image');
  
  uploadSingle(req, res, (err) => {
    if (err) {
      console.error('文件上传错误:', err);
      
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: '文件大小不能超过 5MB',
              timestamp: new Date().toISOString()
            }
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            error: {
              code: 'TOO_MANY_FILES',
              message: '一次只能上传一个文件',
              timestamp: new Date().toISOString()
            }
          });
        }
      }
      
      return res.status(400).json({
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message || '文件上传失败',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: '请选择要上传的图片文件',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // 构建文件访问 URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const fileUrl = `${baseUrl}/uploads/images/${req.file.filename}`;
    
    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl
      },
      message: '图片上传成功',
      timestamp: new Date().toISOString()
    });
  });
});

// 获取上传的图片列表 (需要认证)
router.get('/images', authenticateToken, (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    
    const imageList = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          url: `${baseUrl}/uploads/images/${file}`,
          size: stats.size,
          uploadTime: stats.birthtime
        };
      })
      .sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime)); // 按上传时间倒序
    
    res.json({
      success: true,
      data: imageList,
      total: imageList.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('获取图片列表错误:', error);
    res.status(500).json({
      error: {
        code: 'LIST_ERROR',
        message: '获取图片列表失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 删除图片 (需要认证)
router.delete('/images/:filename', authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: {
          code: 'FILE_NOT_FOUND',
          message: '图片文件不存在',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // 删除文件
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: '图片删除成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('删除图片错误:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_ERROR',
        message: '删除图片失败',
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;