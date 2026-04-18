# FB AutoPoster Backend

Đây là máy chủ API hỗ trợ hệ thống Facebook Marketing Automation. Nó cung cấp REST API và WebSocket để kết nối Web App và Chrome Extension.

## Tính Năng Chính
- **Quản lý Tài Khoản**: Chạy chuẩn OAuth 2.0 để liên kết Profile và Pages.
- **Mã Hóa Token**: Lưu trữ tự động với chuẩn mã hoá AES-256 (CBC).
- **Background Scheduler**: Hệ thống lên lịch tự động đăng bài theo kịch bản ngầm với `node-cron`. Randomize thời gian delay tránh bị check-point.
- **Spintax Context Engine**: Sinh content theo tuỳ biến siêu mượt `{A|B}`.
- **Real-time Log Monitoring**: Tracking các sự kiện hoạt động qua WebSockets.
- **Flat-file Storage**: JSON DB lưu dữ liệu gọn, không lệ thuộc RDBMS bên ngoài ở Phase 1.

## Cài đặt hệ thống

### 1. Chuẩn bị Môi trường
- Yêu cầu Node.js >= 18
- Copy file cấu hình môi trường:
```bash
cp .env.example .env
```
- Điền các thông số vào file `.env` vừa sao chép. Quan trọng nhất là `ENCRYPTION_KEY` (chuỗi bảo mật Database Token) và thông số `FB_APP_ID`.

### 2. Cài Đặt Thư viện
Khởi chạy lệnh này tại thư mục chứa file `package.json`
```bash
npm install
```

### 3. Khởi Chạy
- **Môi trường Phát triển (Dev Mode):** Sử dụng `nodemon` để auto reload mỗi khi đổi code.
```bash
npm run dev
```
- **Môi trường Sản xuất (Production):**
```bash
npm start
```

## Kết Nối
- Backend URL mặc định: `http://localhost:3000`
- API Prefix: `http://localhost:3000/api/v1/`
- WebSocket Server: Connect tại đường dẫn WSS `ws://localhost:3000` (Port tương tự như HTTP)

## Thư mục Data
Toàn bộ dữ liệu logs, accounts, settings sẽ được tự động trích xuất và sinh ra tại thư mục `./data/*.json` trong lần call API đầu tiên. Thư mục này nên được ignore nếu đưa lên git repository.
