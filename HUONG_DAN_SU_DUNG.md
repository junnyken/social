# 📘 HƯỚNG DẪN SỬ DỤNG SOCIALHUB — TỪ A ĐẾN Z

> **SocialHub** là nền tảng quản lý mạng xã hội toàn diện: Đăng bài tự động lên Facebook, Lên lịch nội dung, AI viết bài, Duyệt bài theo quy trình, Phân tích số liệu, Quản lý tin nhắn & CRM khách hàng — tất cả trong một giao diện duy nhất.

---

## 📋 MỤC LỤC

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt & Khởi chạy](#2-cài-đặt--khởi-chạy)
3. [Cấu hình môi trường (.env)](#3-cấu-hình-môi-trường-env)
4. [Kết nối Facebook (OAuth)](#4-kết-nối-facebook-oauth)
5. [Tính năng: Đăng bài & Lên lịch](#5-tính-năng-đăng-bài--lên-lịch)
6. [Tính năng: AI Viết bài (Gemini)](#6-tính-năng-ai-viết-bài-gemini)
7. [Tính năng: Workflow Duyệt bài](#7-tính-năng-workflow-duyệt-bài)
8. [Tính năng: Calendar / Lịch Nội dung](#8-tính-năng-calendar--lịch-nội-dung)
9. [Tính năng: Analytics Dashboard](#9-tính-năng-analytics-dashboard)
10. [Tính năng: Social Listening](#10-tính-năng-social-listening)
11. [Tính năng: Inbox / CRM Khách hàng](#11-tính-năng-inbox--crm-khách-hàng)
12. [Tính năng: Kho Thư viện (Library)](#12-tính-năng-kho-thư-viện-library)
13. [Tính năng: Quản lý Team](#13-tính-năng-quản-lý-team)
14. [Tính năng: Agency & Multi-Workspace](#14-tính-năng-agency--multi-workspace)
15. [Tính năng: Integrations (UTM, GA4, Pixel)](#15-tính-năng-integrations-utm-ga4-pixel)
16. [Webhook Facebook (Real-time)](#16-webhook-facebook-real-time)
17. [API Reference](#17-api-reference)
18. [Cấu trúc thư mục dự án](#18-cấu-trúc-thư-mục-dự-án)
19. [Triển khai Production](#19-triển-khai-production)
20. [Xử lý sự cố (FAQ)](#20-xử-lý-sự-cố-faq)

---

## 1. Yêu cầu hệ thống

| Thành phần | Yêu cầu tối thiểu |
|-----------|-------------------|
| **Node.js** | v18+ (khuyến nghị v20 LTS) |
| **npm** | v9+ |
| **Trình duyệt** | Chrome/Edge/Firefox bản mới nhất |
| **Hệ điều hành** | Windows 10/11, macOS, Linux |
| **RAM** | 2GB trở lên |
| **Disk** | 500MB trống |

### Tài khoản cần chuẩn bị:
- ✅ **Facebook Developer App** → [developers.facebook.com](https://developers.facebook.com)
- ✅ **Gemini API Key** → [aistudio.google.com](https://aistudio.google.com/apikey)
- ⚡ (Tùy chọn) **ngrok** → Cho Webhook real-time

---

## 2. Cài đặt & Khởi chạy

### Bước 1: Clone dự án (hoặc mở thư mục đã có)
```bash
cd "c:\Users\THIEN TRIEU\Documents\Social"
```

### Bước 2: Cài đặt Backend Dependencies
```bash
cd backend
npm install
```

### Bước 3: Tạo file `.env`
```bash
# Copy file mẫu
copy .env.example .env
```
> Sau đó mở `.env` và điền các giá trị thật (xem mục 3 bên dưới)

### Bước 4: Khởi chạy Server
```bash
# Chế độ Development (tự restart khi sửa code)
npm run dev

# Hoặc chế độ Production
npm start
```

### Bước 5: Mở trình duyệt
```
http://localhost:3000
```

> 🎉 **Xong!** Bạn sẽ thấy giao diện SocialHub hoàn chỉnh.

---

## 3. Cấu hình môi trường (.env)

Mở file `backend/.env` và điền các giá trị:

```env
# ─── Chung ───────────────────────────────────────
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000

# ─── Facebook App ────────────────────────────────
# Lấy từ: developers.facebook.com → App Settings → Basic
FB_APP_ID=your_app_id_here
FB_APP_SECRET=your_app_secret_here
FB_REDIRECT_URI=http://localhost:3000/api/v1/auth/callback

# ─── Gemini AI ───────────────────────────────────
# Lấy từ: aistudio.google.com → Get API Key
GEMINI_API_KEY=your_gemini_api_key_here

# ─── Mã hoá DB ──────────────────────────────────
ENCRYPTION_KEY="FB_AUTOPOSTER_DEFAULT_KEY_32B_!!!"
```

### Cách lấy Facebook App ID & Secret:
1. Vào [developers.facebook.com](https://developers.facebook.com)
2. Bấm **My Apps** → **Create App** → Chọn **Business** → Bấm **Next**
3. Điền tên App (VD: "SocialHub") → Bấm **Create**
4. Vào **Settings → Basic** → Copy **App ID** và **App Secret**
5. Ở mục **Valid OAuth Redirect URIs**, thêm: `http://localhost:3000/api/v1/auth/callback`

### Cách lấy Gemini API Key:
1. Vào [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Bấm **Create API Key** → Chọn **Create in new project**
3. Copy key và dán vào `.env`

---

## 4. Kết nối Facebook (OAuth)

### Bước 1: Đăng nhập Facebook
1. Mở SocialHub trên trình duyệt: `http://localhost:3000`
2. Click vào biểu tượng **Facebook** trên thanh sidebar (hoặc tab **Accounts**)
3. Bấm nút **🔗 Kết nối Facebook**
4. Một cửa sổ popup sẽ mở ra → Đăng nhập Facebook → Cho phép quyền truy cập

### Bước 2: Chọn Fanpage
- Sau khi đăng nhập thành công, hệ thống sẽ hiện danh sách **tất cả Fanpage** bạn quản lý
- Bấm **Kết nối** bên cạnh Fanpage muốn dùng
- Token sẽ được tự động exchange sang **Long-lived Token** (60 ngày)

### Bước 3: Xác nhận
- Fanpage đã kết nối sẽ hiện biểu tượng ✅ xanh
- Bạn có thể kết nối nhiều Fanpage cùng lúc

> ⚠️ **Lưu ý quan trọng:**
> - Token sẽ hết hạn sau ~60 ngày → Cần kết nối lại
> - Nếu bạn đổi mật khẩu Facebook → Token bị vô hiệu ngay lập tức
> - App ở chế độ **Development** chỉ cho phép Admin/Test Users của App sử dụng

---

## 5. Tính năng: Đăng bài & Lên lịch

### 5.1 Đăng bài ngay lập tức
1. Vào tab **Compose** (Soạn bài)
2. Viết nội dung bài đăng
3. Chọn Fanpage muốn đăng
4. Bấm **🚀 Đăng ngay**
5. Hệ thống sẽ đẩy bài vào Queue → Scheduler tự động publish lên Facebook

### 5.2 Lên lịch đăng bài
1. Soạn bài xong, chọn **📅 Lên lịch** thay vì "Đăng ngay"
2. Chọn ngày/giờ muốn đăng
3. Bài sẽ nằm trong **Queue** (Hàng đợi) và được đăng đúng giờ

### 5.3 Hàng đợi (Queue)
- Tab **Queue** hiển thị tất cả bài đang chờ đăng
- Bạn có thể:
  - 📝 Sửa nội dung
  - 🗑️ Xóa bài khỏi hàng đợi
  - ⏰ Đổi giờ đăng
  - 👀 Xem trạng thái (pending / publishing / published / error)

### 5.4 Giới hạn an toàn (Safety Guard)
- Hệ thống tự động giới hạn **tối đa 20 bài/ngày** cho mỗi tài khoản
- Delay ngẫu nhiên **8-15 phút** giữa mỗi bài để tránh bị Facebook flag spam
- Chỉ đăng trong khung giờ **7:00 - 22:00** (cấu hình được)

---

## 6. Tính năng: AI Viết bài (Gemini)

### 6.1 Soạn bài bằng AI (Compose)
1. Vào tab **AI**
2. Chọn sub-tab **Compose**
3. Điền:
   - **Chủ đề**: VD: "Khuyến mãi mùa hè"
   - **Giọng văn**: Chuyên nghiệp / Vui vẻ / Trang trọng
   - **Nền tảng**: Facebook / Instagram / Tất cả
4. Bấm **✨ Tạo nội dung**
5. AI sẽ sinh ra bài viết hoàn chỉnh kèm hashtag
6. Bấm **Đăng ngay** hoặc **Lên lịch** ngay từ kết quả AI

### 6.2 Tái sử dụng nội dung (Repurpose)
1. Chọn sub-tab **Repurpose**
2. Dán nội dung cũ vào → AI sẽ viết lại theo phong cách mới
3. Hữu ích khi muốn đăng lại content cũ mà không bị trùng lặp

### 6.3 Chat với AI
- Sub-tab **Chat** cho phép bạn hỏi đáp trực tiếp với AI
- VD: "Gợi ý 5 ý tưởng content cho tuần này" hoặc "Viết caption cho ảnh sản phẩm"

---

## 7. Tính năng: Workflow Duyệt bài

### 7.1 Quy trình duyệt bài (State Machine)
```
📝 Draft → ⏳ Chờ duyệt → ✅ Đã duyệt → 🚀 Đã đăng
                 ↓
              ❌ Từ chối → 📝 Draft (sửa lại)
```

### 7.2 Cách sử dụng
1. Vào tab **Workflow**
2. Bạn sẽ thấy **Kanban Board** với 5 cột:
   - **Draft** (Nháp) — Bài mới tạo
   - **Review** (Chờ duyệt) — Đã gửi cho Manager
   - **Approved** (Đã duyệt) — Manager đã OK
   - **Rejected** (Từ chối) — Cần sửa lại
   - **Published** (Đã đăng) — Đã lên Facebook

3. **Editor** tạo bài → bấm **Gửi duyệt**
4. **Manager** xem bài → bấm **Duyệt** hoặc **Từ chối** (kèm lý do)
5. Bài được duyệt → Editor bấm **🚀 Đăng ngay** → Bài tự động vào Queue & đăng lên Facebook

### 7.3 Comments trên bài
- Mỗi bài có phần **bình luận** để team trao đổi
- Manager có thể ghi chú lý do từ chối
- Toàn bộ lịch sử comments được lưu lại

> 💡 **Lưu ý**: Dữ liệu Workflow được lưu vĩnh viễn. F5 tải lại trang sẽ không mất data.

---

## 8. Tính năng: Calendar / Lịch Nội dung

### 8.1 Xem lịch
1. Vào tab **Calendar**
2. Bạn sẽ thấy lịch theo **tháng** với các bài đã lên lịch
3. Mỗi ô ngày hiển thị:
   - Số bài đăng
   - Trạng thái (pending / published / error)
   - Nền tảng (Facebook / Instagram)

### 8.2 Tương tác
- Click vào một ngày → Xem chi tiết bài đăng trong ngày đó
- Kéo thả bài giữa các ngày (nếu hỗ trợ)
- Calendar và Queue **chia sẻ chung dữ liệu** — thay đổi ở 1 nơi sẽ tự cập nhật ở nơi kia

---

## 9. Tính năng: Analytics Dashboard

### 9.1 Tổng quan KPIs
- **Followers**: Số người theo dõi Fanpage (lấy từ Facebook Graph API thật)
- **Reach**: Phạm vi tiếp cận
- **Impressions**: Số lần hiển thị
- **Engagement Rate**: Tỷ lệ tương tác
- **Posts Count**: Tổng bài đã đăng

### 9.2 Nguồn dữ liệu
| Data | Nguồn |
|------|-------|
| Followers, Reach, Impressions | Facebook Graph API (Real) |
| Posts Published, Success Rate | Scheduler Logs (Real) |
| Nếu chưa kết nối Fanpage | Mock data (Fallback) |

### 9.3 Cách xem
1. Vào tab **Analytics**
2. Chọn khoảng thời gian: 7 ngày / 30 ngày / 90 ngày
3. Xem biểu đồ xu hướng đăng bài, tỷ lệ thành công, phân tích lỗi

> 💡 **Tips**: Kết nối Fanpage thật để xem số liệu thật. Nếu chưa kết nối, hệ thống sẽ hiện mock data để bạn xem giao diện.

---

## 10. Tính năng: Social Listening

### 10.1 Giám sát mạng xã hội
- Tab **Listening** cho phép bạn theo dõi:
  - 🔍 **Keywords**: Từ khóa đang được nhắc đến
  - 📰 **Feed**: Dòng thời gian các bài viết liên quan
  - 😃 **Sentiment**: Phân tích cảm xúc (Tích cực / Tiêu cực / Trung tính)
  - 🔔 **Alerts**: Cảnh báo khi có sự kiện quan trọng

### 10.2 Webhook Real-time
- Khi có ai **comment / mention** Fanpage, Facebook sẽ tự động gửi thông báo đến server
- Alert sẽ hiện ngay trên Dashboard mà bạn không cần F5
- (Yêu cầu cấu hình Webhook — xem mục 16)

---

## 11. Tính năng: Inbox / CRM Khách hàng

### 11.1 Hộp thư đến
- Tab **Inbox** hiển thị tất cả tin nhắn từ khách hàng gửi qua Fanpage
- Hỗ trợ:
  - 💬 Xem tin nhắn theo thread
  - 📋 Phân loại (mới / đã đọc / đã trả lời)
  - 🏷️ Gắn tag cho cuộc hội thoại

### 11.2 CRM Contacts
- Mỗi khách hàng nhắn tin sẽ được tự động tạo hồ sơ trong **Contacts**
- Thông tin bao gồm:
  - Tên Facebook
  - Số lần tương tác
  - Tags / Ghi chú
  - Lịch sử tin nhắn

---

## 12. Tính năng: Kho Thư viện (Library)

### 12.1 Media Library
- Upload và quản lý hình ảnh / video dùng cho bài đăng
- Gắn **Tags** để tìm kiếm nhanh
- Theo dõi **số lần sử dụng** mỗi hình ảnh

### 12.2 Caption Templates
- Tạo các **mẫu caption** có sẵn (VD: Flash Sale, Engagement, Product Launch...)
- Hỗ trợ **biến thay thế**: `{{product}}`, `{{price}}`, `{{link}}`...
- Khi soạn bài → chọn Template → điền biến → ra bài hoàn chỉnh trong 10 giây

### 12.3 Templates có sẵn
| Tên | Loại | Nền tảng |
|-----|------|---------|
| 🔥 Flash Sale | Promotion | Tất cả |
| 💬 Engagement | Engagement | Facebook |
| 📢 Product Launch | Announcement | Tất cả |
| 🙏 Thank You | Engagement | Tất cả |
| 📸 IG Reels | Engagement | Instagram |

> 💡 Tất cả templates và media được lưu vĩnh viễn trong `data/library.json`.

---

## 13. Tính năng: Quản lý Team

### 13.1 Roles & Permissions (Vai trò)

| Role | Icon | Quyền hạn |
|------|------|----------|
| **Owner** | 👑 | Toàn quyền — quản lý team, xóa workspace |
| **Manager** | 💼 | Tạo/Duyệt/Đăng bài, xem Analytics, quản lý Inbox |
| **Editor** | ✍️ | Tạo/Sửa bài, gửi duyệt, xem Analytics |
| **Viewer** | 👀 | Chỉ xem Analytics, Library, Inbox |

### 13.2 Quản lý thành viên
1. Vào tab **Team**
2. Bấm **Thêm thành viên** → Điền tên, email, chọn role
3. Đổi role: Click vào role hiện tại → chọn role mới
4. Xóa thành viên: Bấm biểu tượng 🗑️

### 13.3 Lời mời (Invitations)
- Tạo lời mời qua email → Hệ thống tạo link invite (hạn 7 ngày)
- Xem danh sách lời mời đang chờ
- Thu hồi lời mời bất kỳ lúc nào

### 13.4 Activity Log
- Mọi thay đổi trong team đều được ghi lại:
  - "Trieu thêm Linh với role Editor"
  - "Trieu đổi role Minh: Editor → Manager"
  - "Trieu xóa Hung khỏi team"

---

## 14. Tính năng: Agency & Multi-Workspace

### 14.1 Multi-Workspace
- Tạo nhiều **Workspace** riêng biệt (Personal, Team, Agency)
- Mỗi Workspace có:
  - Team riêng
  - Social accounts riêng
  - Settings riêng (timezone, language, theme)

### 14.2 Pricing Plans

| Plan | Giá | Members | Clients | Tính năng nổi bật |
|------|-----|---------|---------|-------------------|
| **Free** | 0₫ | 1 | 5 | Basic posting, Queue 50 bài |
| **Starter** | 99K₫/th | 3 | 15 | AI, Advanced Analytics, 5 workspaces |
| **Pro** | 299K₫/th | 10 | 50 | Pixel, RSS, Unlimited workspaces |
| **Agency** | 999K₫/th | 50 | ∞ | White-label, Client billing |

### 14.3 Client Manager
- Quản lý danh sách khách hàng (cho mô hình Agency)
- Mỗi client có: Tên, ngành, email, social accounts, budget
- Assign thành viên team phụ trách từng client
- Xem metrics riêng từng client

---

## 15. Tính năng: Integrations (UTM, GA4, Pixel)

### 15.1 UTM Builder
- Tự động gắn UTM parameters vào link
- Templates sẵn: Default, Seasonal Campaign
- Hỗ trợ batch generate cho nhiều bài cùng lúc
- Lịch sử UTM đã tạo + Thống kê theo platform/campaign

### 15.2 GA4 Tracker
- Tích hợp Google Analytics 4
- Theo dõi traffic từ social media
- Xem conversion data

### 15.3 Conversion Pixel
- Gắn Facebook Pixel vào landing page
- Theo dõi chuyển đổi từ bài đăng

### 15.4 ROI Calculator
- Tính ROI cho từng campaign
- So sánh chi phí quảng cáo vs. doanh thu

---

## 16. Webhook Facebook (Real-time)

### 16.1 Tại sao cần Webhook?
- Thay vì bạn phải F5 để kiểm tra comment mới, **Facebook sẽ tự động gửi data** đến server của bạn ngay lập tức khi có:
  - Comment mới trên post
  - Ai đó mention Fanpage
  - Tin nhắn mới

### 16.2 Cách cấu hình (Local Development)

#### Bước 1: Cài ngrok
```bash
# Download từ ngrok.com hoặc
npm install -g ngrok
```

#### Bước 2: Tạo tunnel
```bash
ngrok http 3000
```
Bạn sẽ nhận được URL dạng: `https://abc123.ngrok.io`

#### Bước 3: Cấu hình trên Facebook
1. Vào [developers.facebook.com](https://developers.facebook.com) → App của bạn
2. Chọn **Products → Webhooks → Settings**
3. Chọn **Page** → Bấm **Subscribe to this topic**
4. Điền:
   - **Callback URL**: `https://abc123.ngrok.io/api/v1/webhook/facebook`
   - **Verify Token**: `socialhub`
5. Bấm **Verify and Save**
6. Tick chọn các fields: `feed`, `messages`, `mentions`

#### Bước 4: Test
- Comment vào 1 bài đăng trên Fanpage
- Kiểm tra terminal → Sẽ thấy log `[Webhook] Change for Page...`
- Vào tab Listening → Alert sẽ hiện lên

---

## 17. API Reference

### Base URL: `http://localhost:3000/api/v1`

### 🔐 Authentication
| Method | Endpoint | Mô tả |
|--------|---------|-------|
| GET | `/auth/login` | Redirect tới Facebook OAuth |
| GET | `/auth/callback` | Nhận callback từ Facebook |
| GET | `/auth/status` | Kiểm tra trạng thái đăng nhập |

### 📝 Workflow
| Method | Endpoint | Mô tả |
|--------|---------|-------|
| GET | `/workflow` | Lấy tất cả posts workflow |
| POST | `/workflow` | Tạo post mới (state: draft) |
| PATCH | `/workflow/:id` | Chuyển trạng thái (submit/approve/reject/publish) |
| DELETE | `/workflow/:id` | Xóa post |
| POST | `/workflow/:id/comments` | Thêm comment |

### 📅 Queue (Scheduler)
| Method | Endpoint | Mô tả |
|--------|---------|-------|
| GET | `/queue` | Lấy tất cả scheduled posts |
| POST | `/queue` | Thêm bài vào hàng đợi |
| PATCH | `/queue/:id` | Sửa bài trong hàng đợi |
| DELETE | `/queue/:id` | Xóa bài khỏi hàng đợi |
| GET | `/queue/stats` | Thống kê queue |

### 👥 Team
| Method | Endpoint | Mô tả |
|--------|---------|-------|
| GET | `/team` | Lấy team data (members + invites + activities) |
| POST | `/team/members` | Thêm thành viên |
| PATCH | `/team/members/:id` | Đổi role |
| DELETE | `/team/members/:id` | Xóa thành viên |
| POST | `/team/invitations` | Tạo lời mời |
| DELETE | `/team/invitations/:id` | Thu hồi lời mời |

### 📚 Library
| Method | Endpoint | Mô tả |
|--------|---------|-------|
| GET | `/library` | Lấy tất cả media + templates |
| POST | `/library/media` | Thêm media item |
| PATCH | `/library/media/:id` | Update tags |
| DELETE | `/library/media/:id` | Xóa media |
| POST | `/library/templates` | Tạo template |
| DELETE | `/library/templates/:id` | Xóa template |

### 🏢 Agency
| Method | Endpoint | Mô tả |
|--------|---------|-------|
| GET | `/agency/workspaces` | Danh sách workspaces |
| POST | `/agency/workspaces` | Tạo workspace |
| PATCH | `/agency/workspaces/:id` | Cập nhật workspace |
| DELETE | `/agency/workspaces/:id` | Xóa workspace |
| GET | `/agency/clients` | Danh sách clients |
| POST | `/agency/clients` | Tạo client |
| PATCH | `/agency/clients/:id` | Cập nhật client |
| DELETE | `/agency/clients/:id` | Xóa client |

### 🤖 AI (Gemini)
| Method | Endpoint | Mô tả |
|--------|---------|-------|
| POST | `/ai/compose` | AI viết bài mới |
| POST | `/ai/repurpose` | AI viết lại nội dung |
| POST | `/ai/chat` | Chat với AI |

### 📊 Analytics & Insights
| Method | Endpoint | Mô tả |
|--------|---------|-------|
| GET | `/analytics/overview?range=30` | Thống kê tổng quan |
| GET | `/analytics/trends?range=30` | Xu hướng đăng bài |
| GET | `/insights/:pageId/overview?range=30` | KPIs từ Facebook Graph API |

### 📬 Inbox & Contacts
| Method | Endpoint | Mô tả |
|--------|---------|-------|
| GET | `/inbox/:pageId/conversations` | Lấy cuộc hội thoại |
| POST | `/inbox/:pageId/conversations/:id/reply` | Trả lời tin nhắn |
| GET | `/contacts` | Danh sách contacts |
| POST | `/contacts` | Tạo contact |

### 🔔 Webhook
| Method | Endpoint | Mô tả |
|--------|---------|-------|
| GET | `/webhook/facebook` | Verify webhook (challenge) |
| POST | `/webhook/facebook` | Nhận events từ Facebook |

### 🏥 Health Check
| Method | Endpoint | Mô tả |
|--------|---------|-------|
| GET | `/health` | Kiểm tra server status |

---

## 18. Cấu trúc thư mục dự án

```
Social/
├── 📄 fb-autoposter.html      ← Trang chính (SPA)
├── 📄 auth-callback.html      ← Trang nhận OAuth callback
├── 📄 sw.js                   ← Service Worker (PWA)
│
├── 📁 backend/                ← Server Node.js
│   ├── 📄 server.js           ← Entry point, mount routes
│   ├── 📄 config.js           ← Cấu hình môi trường
│   ├── 📄 .env                ← Biến môi trường (KHÔNG commit lên Git)
│   ├── 📁 routes/             ← 18 API route files
│   │   ├── auth.routes.js     ← OAuth Facebook
│   │   ├── workflow.routes.js ← Duyệt bài CRUD
│   │   ├── queue.routes.js    ← Hàng đợi đăng bài
│   │   ├── team.routes.js     ← Quản lý thành viên
│   │   ├── library.routes.js  ← Kho media & templates
│   │   ├── agency.routes.js   ← Workspace & clients
│   │   ├── gemini.routes.js   ← AI endpoints
│   │   ├── inbox.routes.js    ← Tin nhắn
│   │   ├── insights.routes.js ← Facebook Insights
│   │   ├── webhook.routes.js  ← Facebook Webhook
│   │   └── ... (8 files nữa)
│   ├── 📁 services/           ← Business logic
│   │   ├── fb-graph-v2.service.js  ← Facebook Graph API
│   │   ├── gemini.service.js       ← Gemini AI
│   │   ├── scheduler.service.js    ← Cron scheduler
│   │   ├── analytics.service.js    ← Thống kê
│   │   └── ...
│   ├── 📁 middleware/         ← Auth, rate-limit
│   └── 📁 data/              ← JSON Database files
│       ├── accounts.json      ← Tài khoản Facebook đã kết nối
│       ├── schedules.json     ← Queue & Calendar data
│       ├── workflows.json     ← Dữ liệu Workflow
│       ├── team.json          ← Thành viên team
│       ├── library.json       ← Media & Templates
│       ├── agency.json        ← Workspaces & Clients
│       └── logs.json          ← Lịch sử hoạt động
│
├── 📁 modules/                ← Frontend JavaScript modules
│   ├── 📁 workflow/           ← Kanban board UI
│   ├── 📁 scheduler/         ← Queue management UI
│   ├── 📁 calendar/          ← Calendar view UI
│   ├── 📁 analytics/         ← Dashboard & charts UI
│   ├── 📁 ai/                ← AI compose/repurpose UI
│   ├── 📁 inbox/             ← Messaging UI
│   ├── 📁 team/              ← Team management UI
│   ├── 📁 library/           ← Media library UI
│   ├── 📁 listening/         ← Social listening UI
│   ├── 📁 agency/            ← Agency workspace UI
│   ├── 📁 integrations/      ← UTM, GA4, Pixel UI
│   ├── 📁 facebook/          ← FB Auth & API helpers
│   └── 📄 api-client.js      ← Centralized fetch wrapper
│
└── 📁 assets/                 ← CSS, images, view scripts
```

---

## 19. Triển khai Production

### Cách 1: Deploy bằng Docker
```bash
# Build image
docker build -t socialhub .

# Chạy container
docker run -p 3000:3000 --env-file backend/.env socialhub
```

### Cách 2: Deploy lên VPS (Ubuntu)
```bash
# Clone repo
git clone https://github.com/your-username/Social.git
cd Social/backend

# Cài dependencies
npm install --production

# Cấu hình .env
cp .env.example .env
nano .env  # Điền các giá trị thật

# Chạy bằng PM2 (process manager)
npm install -g pm2
pm2 start server.js --name socialhub
pm2 save
pm2 startup
```

### Cách 3: Deploy lên Render / Railway
1. Push code lên GitHub
2. Vào [render.com](https://render.com) → New Web Service
3. Connect GitHub repo
4. Điền:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Thêm Environment Variables từ file `.env`
6. Bấm **Deploy**

### Lưu ý Production:
- ⚠️ Đổi `NODE_ENV=production` trong `.env`
- ⚠️ Đổi `ALLOWED_ORIGINS` sang domain thật
- ⚠️ Đổi `FB_REDIRECT_URI` sang URL production
- ⚠️ Cập nhật Valid OAuth Redirect URIs trên Facebook Developer
- ⚠️ Đổi `ENCRYPTION_KEY` sang key mạnh hơn (32 ký tự ngẫu nhiên)

---

## 20. Xử lý sự cố (FAQ)

### ❓ Server không khởi động được
```
Error: Cannot find module 'express'
```
**Giải pháp**: Chạy `cd backend && npm install`

---

### ❓ Lỗi "Port 3000 already in use"
**Giải pháp** (Windows):
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

### ❓ Facebook OAuth lỗi "URL blocked"
**Giải pháp**:
1. Vào Facebook Developer → App Settings → Basic
2. Thêm `localhost` vào **App Domains**
3. Thêm `http://localhost:3000/api/v1/auth/callback` vào **Valid OAuth Redirect URIs**

---

### ❓ Gemini AI trả về lỗi
**Giải pháp**:
1. Kiểm tra `GEMINI_API_KEY` trong `.env`
2. Vào [aistudio.google.com](https://aistudio.google.com) → Kiểm tra key còn hoạt động
3. Kiểm tra quota API (free tier = 60 requests/phút)

---

### ❓ Bài đăng không lên Facebook
**Kiểm tra**:
1. Token đã expired? → Kết nối lại Facebook
2. Fanpage đã được chọn? → Kiểm tra tab Accounts
3. Vượt giới hạn 20 bài/ngày? → Xem logs
4. Ngoài khung giờ 7-22h? → Chờ đến ngày hôm sau

---

### ❓ Data bị mất sau khi F5
**Trả lời**: Từ Phase S+T trở đi, TOÀN BỘ data được persist vào file JSON. Nếu vẫn mất, kiểm tra:
1. Folder `backend/data/` có tồn tại không?
2. Server đang chạy không? (Data lưu qua backend API)
3. Mở DevTools (F12) → Console → Xem có lỗi fetch không

---

### ❓ Webhook không nhận data
**Kiểm tra**:
1. ngrok đang chạy? (`ngrok http 3000`)
2. URL callback đúng? (`https://xxx.ngrok.io/api/v1/webhook/facebook`)
3. Verify token đúng? (phải là `socialhub`)
4. Đã subscribe fields `feed`, `messages`?
5. Facebook App ở chế độ **Live** (không phải Development)?

---

> 📧 **Hỗ trợ**: Nếu gặp vấn đề không giải quyết được, hãy mở Issue trên GitHub repo hoặc liên hệ developer.
>
> 🎉 **Chúc bạn sử dụng SocialHub thành công!**
