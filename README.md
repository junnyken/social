# FB AutoPoster

Hệ thống quản lý, phân tích và đăng bài tự động trên nhiều nền tảng mảng xã hội (Facebook, Instagram, X).

## Tính năng nổi bật
- **AutoPoster:** Lên lịch đăng bài tự động qua Page, Group.
- **Analytics Dashboard:** Phân tích chỉ số tăng trưởng, cảm xúc, tỷ lệ tương tác.
- **Social Listening:** Nghe ngóng mentions từ xa, tính điểm Sentiment.
- **Performance:** Offline PWA caching, Backend In-memory Cache, Rate-Limiting.

---

## 🚀 Hướng Dẫn Triển Khai (Deployment Guide)

### 1. Triển khai bằng Docker (Recomended)
Cách cấu hình nhanh nhất trên mọi VPS (Ubuntu, CentOS, etc.)

**Yêu cầu:** Đã cài đặt `docker` và `docker-compose`.

```bash
# 1. Clone source code
git clone https://github.com/junnyken/social.git fb-autoposter
cd fb-autoposter

# 2. Cấu hình Environment
cp backend/.env.example backend/.env
# Sửa backend/.env theo production (thêm AppID, API keys, đổi mật khẩu)

# 3. Khởi động với Docker
docker compose up -d --build
```
Hệ thống sẽ chạy ngầm tại Port `3000`. Dữ liệu cấu hình, bài đăng và settings sẽ được lưu an toàn tại thư mục `backend/data/` (đã map volume).

### 2. Triển khai bằng NodeJS (Trên VPS/Cloud)

Sử dụng PM2 để chạy production.

```bash
npm install -g pm2

# 1. Clone source code
git clone https://github.com/junnyken/social.git fb-autoposter
cd fb-autoposter

# 2. Cấu hình Backend
cd backend
npm install
cp .env.example .env

# Chỉnh sửa file .env:
# NODE_ENV=production
# ALLOWED_ORIGINS=https://your-domain.com

# 3. Khởi chạy bằng PM2
pm2 start server.js --name "fb-autoposter"
pm2 save
pm2 startup
```

---

## ⚙️ Cấu hình Nginx (Reverse Proxy)

Nếu bạn dùng VPS, để trỏ domain và HTTPS (SSL), hãy cấu hình Nginx proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Dùng Certbot để lấy SSL cho Nginx:
```bash
sudo certbot --nginx -d your-domain.com
```

## 🛠 Troubleshooting

1. **Lệnh API phản hồi chậm?** 
   - Backend sử dụng Flat-File JSON. Hãy đảm bảo bạn không có quá 1 triệu dòng records trong `backend/data/*`. Hệ thống có In-memory Cache auto clear.
2. **Không kết nối được Socket?**
   - Đảm bảo trong config Nginx có khai báo `Upgrade $http_upgrade`.
3. **Cập nhật Source Code khi cấu hình Docker**
   - Chỉ cần chạy lệnh: `git pull && docker compose up -d --build`
