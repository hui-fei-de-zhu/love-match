# 心动配对 - 部署指南

## 快速开始（本机测试）

```bash
# 1. 进入项目目录
cd love-match

# 2. 安装依赖
npm install

# 3. 启动服务器
npm start

# 4. 打开浏览器
# 前端页面: http://localhost:3456
# 管理后台: http://localhost:3456/admin.html
```

## 部署到服务器（多人跨网络使用）

要让不同WiFi/网络的人都能访问，需要把服务部署到公网服务器。

### 方案一：腾讯云/阿里云轻量应用服务器（推荐）

国内访问最稳定，价格约 50-100 元/月。

```bash
# 1. SSH 登录服务器
ssh root@你的服务器IP

# 2. 安装 Node.js（如未安装）
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. 上传项目文件到服务器
# 在本地执行：
scp -r love-match/ root@你的服务器IP:/opt/love-match/

# 4. 在服务器上安装依赖
cd /opt/love-match
npm install

# 5. 使用 PM2 守护进程
npm install -g pm2
pm2 start server.js --name love-match
pm2 save
pm2 startup  # 设置开机自启
```

### 方案二：使用 Nginx 反向代理（可选，更专业）

```nginx
server {
    listen 80;
    server_name 你的域名或IP;

    location / {
        proxy_pass http://127.0.0.1:3456;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 方案三：Docker 部署

```bash
# 构建镜像
docker build -t love-match .

# 运行容器
docker run -d -p 3456:3456 \
  -v love-data:/app/data \
  -e API_KEY=你的自定义密钥 \
  --name love-match \
  love-match
```

## 配置说明

### 修改 API 密钥

默认密钥是 `love-match-2024`，生产环境建议修改：

```bash
# 启动时设置环境变量
API_KEY=你的自定义密钥 node server.js
```

### 前端连接配置

用户打开网页后，点击右下角 ⚙️ 按钮，填写：
- **服务器地址**：你的服务器地址，如 `http://123.456.789.0:3456`
- **API 密钥**：与服务端设置的密钥一致

配置会自动保存在浏览器中。

## 安全建议

1. **修改默认 API 密钥**：启动时通过环境变量设置 `API_KEY`
2. **使用 HTTPS**：生产环境建议配置 SSL 证书（可用 Let's Encrypt 或腾讯云免费证书）
3. **防火墙**：只开放必要的端口（80/443）
4. **定期备份**：数据存储在 `data/records.json`，建议定期备份此文件

## 免费部署方案（测试用）

如果只是想快速测试，可以使用以下免费服务：

### Render（render.com）
- 注册账号 → New Web Service → 连接GitHub仓库
- Build Command: `npm install`
- Start Command: `npm start`
- 注意：免费版15分钟无访问会休眠，且国内访问较慢

### 端口转发（临时方案）
如果只是想快速给朋友试用，可以在本地启动后用内网穿透工具：
- cpolar.cn（国内可用，免费版够用）
- 下载 cpolar → `cpolar http 3456` → 获得公网地址
