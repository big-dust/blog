const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const rand = Math.floor(Math.random() * 1000);
    const ext = path.extname(file.originalname);
    cb(null, `${ts}_${rand}${ext}`);
  }
});
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只能上传图片'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});

// 上传图片
router.post('/image', authenticateToken, (req, res) => {
  const uploadSingle = upload.single('image');

  uploadSingle(req, res, (err) => {
    if (err) {
      console.log('上传出错:', err.message);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '文件太大了，最多5MB' });
        }
      }
      return res.status(400).json({ error: err.message || '上传失败' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '请选择图片' });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const url = `${baseUrl}/uploads/images/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url
      },
      message: '上传成功'
    });
  });
});

// 获取图片列表
router.get('/images', authenticateToken, (req, res) => {
  try {
    // const files = fs.Sync(uploadDir);
    const files = fs.readdirSync(uploadDir);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

    const list = files
      .filter(f => ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(path.extname(f).toLowerCase()))
      .map(f => {
        const stats = fs.statSync(path.join(uploadDir, f));
        return {
          filename: f,
          url: `${baseUrl}/uploads/images/${f}`,
          size: stats.size,
          uploadTime: stats.birthtime
        };
      })
      .sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime));

    res.json({ success: true, data: list, total: list.length });
  } catch (e) {
    console.log('获取图片列表出错:', e.message);
    res.status(500).json({ error: '获取失败' });
  }
});

// 删除图片
router.delete('/images/:filename', authenticateToken, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '图片不存在' });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: '删除成功' });
  } catch (e) {
    console.log('删除图片出错:', e.message);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
