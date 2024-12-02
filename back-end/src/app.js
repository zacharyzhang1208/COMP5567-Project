import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3001;

// 中间件
app.use(cors());  // 允许跨域请求
app.use(express.json());  // 解析 JSON 请求体

// 基础路由
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// 简单的健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something broke!',
    message: err.message 
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
