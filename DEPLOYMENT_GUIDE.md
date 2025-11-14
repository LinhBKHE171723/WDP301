# 🚀 HƯỚNG DẪN DEPLOY DỰ ÁN RESTAURANT MANAGEMENT LÊN VPS

## 📋 Yêu Cầu Trước Khi Bắt Đầu

- ✅ VPS đã mua (Ubuntu 20.04/22.04 khuyến nghị)
- ✅ Domain name (hoặc dùng IP tạm)
- ✅ Quyền truy cập SSH vào VPS (username + password hoặc SSH key)
- ✅ Thông tin VPS: IP, username, password

---

## 🎯 BƯỚC 1: KẾT NỐI VÀ CÀI ĐẶT MÔI TRƯỜNG VPS

### 1.1. SSH vào VPS

**Trên Windows (PowerShell):**

```powershell
ssh root@YOUR_VPS_IP
# Hoặc nếu có user khác:
ssh username@YOUR_VPS_IP
```

**Lần đầu sẽ hỏi "Are you sure you want to continue connecting?", gõ `yes` và Enter**

### 1.2. Update hệ thống

```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y
```

### 1.3. Cài đặt Node.js (version 20.x LTS)

```bash
# Thêm repository Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Cài đặt Node.js
sudo apt install -y nodejs

# Kiểm tra version
node -v    # Phải hiện v20.x.x
npm -v     # Phải hiện 10.x.x
```

### 1.4. Cài đặt MongoDB

```bash
# Import MongoDB public key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg

# Thêm MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update lại
sudo apt update

# Cài đặt MongoDB
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod

# Enable MongoDB chạy khi khởi động
sudo systemctl enable mongod

# Kiểm tra status
sudo systemctl status mongod
# Nếu thấy "active (running)" là OK
```

### 1.5. Cài đặt PM2 (Process Manager)

```bash
# Cài PM2 globally
sudo npm install -g pm2

# Kiểm tra
pm2 -v
```

### 1.6. Cài đặt Nginx (Web Server)

```bash
# Cài Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx

# Enable Nginx
sudo systemctl enable nginx

# Kiểm tra status
sudo systemctl status nginx
```

### 1.7. Cài đặt Git

```bash
# Cài Git
sudo apt install -y git

# Kiểm tra
git --version
```

---

## 🎯 BƯỚC 2: CLONE PROJECT VÀ CÀI ĐẶT

### 2.1. Tạo thư mục cho project

```bash
# Tạo thư mục
sudo mkdir -p /var/www/restaurant

# Cấp quyền cho user hiện tại
sudo chown -R $USER:$USER /var/www/restaurant

# Vào thư mục
cd /var/www/restaurant
```

### 2.2. Clone project từ GitHub

```bash
# Clone repository
git clone https://github.com/LinhBKHE171723/WDP301.git .

# Checkout nhánh dev
git checkout dev

# Kiểm tra
ls -la
# Phải thấy: admin/, backend/, client/, CLASS_DIAGRAM.puml, etc.
```

---

## 🎯 BƯỚC 3: CÀI ĐẶT VÀ CẤU HÌNH BACKEND

### 3.1. Cài đặt dependencies

```bash
cd /var/www/restaurant/backend

# Cài packages
npm install --production

# Nếu gặp lỗi, thử:
npm install --legacy-peer-deps
```

### 3.2. Tạo file .env cho Production

```bash
# Tạo file .env
nano .env
```

**Copy nội dung này vào (nhớ thay YOUR_DOMAIN):**

```env
HOST=localhost
PORT=5000
MONGO_URI=mongodb://localhost:27017/restaurantDB
JWT_SECRET=your_secret_key_change_this_in_production_12345
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://YOUR_DOMAIN.com
ADMIN_URL=http://YOUR_DOMAIN.com/admin

# Email (giữ nguyên nếu vẫn dùng email này)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=coccoc282003@gmail.com
SMTP_PASS=kuxzafqxvzprucrq

# Cloudinary (giữ nguyên)
CLOUDINARY_CLOUD_NAME=dpr4d0a2g
CLOUDINARY_API_KEY=811346262594982
CLOUDINARY_API_SECRET=ZfYqjdhCyQgUHXvubAwCEjpL_Cs

NODE_ENV=production
```

**Cách lưu file trong nano:**

- Nhấn `Ctrl + X`
- Nhấn `Y` để confirm
- Nhấn `Enter` để lưu

### 3.3. Seed database (tạo dữ liệu mẫu)

```bash
# Chạy seed script
node scripts/seed.js

# Nếu thành công sẽ thấy: "✅ Seed thành công!"
```

### 3.4. Test chạy backend

```bash
# Test chạy
node server.js

# Nếu thấy:
# "Server is running on port 5000"
# "MongoDB Connected"
# Thì là OK!

# Nhấn Ctrl+C để dừng
```

### 3.5. Chạy backend với PM2

```bash
# Start backend với PM2
pm2 start server.js --name restaurant-backend

# Xem logs
pm2 logs restaurant-backend

# Lưu config PM2 để tự start khi reboot
pm2 save
pm2 startup
# Copy lệnh mà PM2 hiện ra và chạy lệnh đó
```

---

## 🎯 BƯỚC 4: BUILD VÀ CẤU HÌNH ADMIN FRONTEND

### 4.1. Cài đặt dependencies

```bash
cd /var/www/restaurant/admin

# Cài packages
npm install

# Nếu gặp lỗi, thử:
npm install --legacy-peer-deps
```

### 4.2. Cấu hình .env cho Production

```bash
# Sửa file .env
nano .env
```

**Thay bằng (nhớ thay YOUR_DOMAIN):**

```env
REACT_APP_API_URL=http://YOUR_DOMAIN.com/api
REACT_APP_WS_URL=ws://YOUR_DOMAIN.com/ws
```

**Lưu file: Ctrl+X → Y → Enter**

### 4.3. Build admin frontend

```bash
# Build production
npm run build

# Chờ vài phút...
# Kết quả: thư mục build/ được tạo
ls -la build/
```

---

## 🎯 BƯỚC 5: BUILD VÀ CẤU HÌNH CLIENT FRONTEND

### 5.1. Kiểm tra .env client

```bash
cd /var/www/restaurant/client

# Kiểm tra xem có file .env không
ls -la | grep .env
```

**Nếu chưa có, tạo file .env:**

```bash
nano .env
```

**Copy vào (nhớ thay YOUR_DOMAIN):**

```env
REACT_APP_API_URL=http://YOUR_DOMAIN.com/api
REACT_APP_WS_URL=ws://YOUR_DOMAIN.com/ws
```

**Lưu file: Ctrl+X → Y → Enter**

### 5.2. Cài đặt dependencies

```bash
# Cài packages
npm install

# Nếu gặp lỗi:
npm install --legacy-peer-deps
```

### 5.3. Build client frontend

```bash
# Build production
npm run build

# Chờ vài phút...
# Kết quả: thư mục build/ được tạo
ls -la build/
```

---

## 🎯 BƯỚC 6: CẤU HÌNH NGINX (WEB SERVER)

### 6.1. Tạo file config Nginx

```bash
# Tạo file config
sudo nano /etc/nginx/sites-available/restaurant
```

### 6.2. Copy config này vào (CHÚ Ý thay YOUR_DOMAIN)

**Nếu bạn có DOMAIN:**

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

    # Client Frontend (Customer App)
    location / {
        root /var/www/restaurant/client/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Admin Frontend
    location /admin {
        alias /var/www/restaurant/admin/build;
        index index.html;
        try_files $uri $uri/ /admin/index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400; # 24 hours for long-lived connections
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Nếu chưa có DOMAIN (dùng IP tạm):**

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    # Client Frontend (Customer App)
    location / {
        root /var/www/restaurant/client/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Admin Frontend
    location /admin {
        alias /var/www/restaurant/admin/build;
        index index.html;
        try_files $uri $uri/ /admin/index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400; # 24 hours for long-lived connections
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Lưu file: Ctrl+X → Y → Enter**

### 6.3. Enable site và restart Nginx

```bash
# Xóa default site
sudo rm /etc/nginx/sites-enabled/default

# Enable site mới
sudo ln -s /etc/nginx/sites-available/restaurant /etc/nginx/sites-enabled/

# Test config
sudo nginx -t
# Phải thấy: "test is successful"

# Restart Nginx
sudo systemctl restart nginx

# Kiểm tra status
sudo systemctl status nginx
```

---

## 🎯 BƯỚC 7: CẤU HÌNH FIREWALL

```bash
# Cho phép SSH (port 22)
sudo ufw allow OpenSSH

# Cho phép HTTP (port 80)
sudo ufw allow 'Nginx HTTP'

# Cho phép HTTPS (port 443) - cho sau này
sudo ufw allow 'Nginx HTTPS'

# Enable firewall
sudo ufw enable
# Gõ 'y' và Enter

# Kiểm tra status
sudo ufw status
```

---

## 🎯 BƯỚC 8: KIỂM TRA WEBSITE

### 8.1. Kiểm tra Backend

```bash
# Test API
curl http://localhost:5000/api/test
# Hoặc
curl http://localhost:5000
```

### 8.2. Truy cập từ trình duyệt

**Nếu có domain:**

- Customer App: `http://YOUR_DOMAIN.com`
- Admin App: `http://YOUR_DOMAIN.com/admin`

**Nếu chỉ có IP:**

- Customer App: `http://YOUR_VPS_IP`
- Admin App: `http://YOUR_VPS_IP/admin`

### 8.3. Đăng nhập Admin

**Thông tin đăng nhập mặc định (từ seed):**

```
Email: admin@example.com
Password: 123456
```

---

## 🎯 BƯỚC 9: CÀI ĐẶT SSL (HTTPS) - NẾU CÓ DOMAIN

### 9.1. Cài Certbot

```bash
# Cài Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 9.2. Tạo SSL Certificate

```bash
# Chạy Certbot (thay YOUR_DOMAIN)
sudo certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com

# Làm theo hướng dẫn:
# 1. Nhập email
# 2. Agree terms (gõ 'y')
# 3. Share email (gõ 'n' hoặc 'y')
# 4. Redirect HTTP to HTTPS (chọn 2)
```

### 9.3. Test auto-renewal

```bash
# Test
sudo certbot renew --dry-run

# Nếu OK là xong!
```

### 9.4. Update file .env với HTTPS

```bash
# Backend .env
cd /var/www/restaurant/backend
nano .env
```

**Sửa:**

```env
FRONTEND_URL=https://YOUR_DOMAIN.com
ADMIN_URL=https://YOUR_DOMAIN.com/admin
```

```bash
# Admin .env
cd /var/www/restaurant/admin
nano .env
```

**Sửa:**

```env
REACT_APP_API_URL=https://YOUR_DOMAIN.com/api
REACT_APP_WS_URL=wss://YOUR_DOMAIN.com/ws
```

```bash
# Client .env
cd /var/www/restaurant/client
nano .env
```

**Sửa:**

```env
REACT_APP_API_URL=https://YOUR_DOMAIN.com/api
REACT_APP_WS_URL=wss://YOUR_DOMAIN.com/ws
```

**Rebuild frontend:**

```bash
# Rebuild admin
cd /var/www/restaurant/admin
npm run build

# Rebuild client
cd /var/www/restaurant/client
npm run build

# Restart backend
pm2 restart restaurant-backend
```

---

## 🎯 BƯỚC 10: MONITORING VÀ MAINTENANCE

### 10.1. Các lệnh hữu ích

```bash
# Xem logs backend
pm2 logs restaurant-backend

# Xem logs 50 dòng cuối
pm2 logs restaurant-backend --lines 50

# Xem status PM2
pm2 status

# Restart backend
pm2 restart restaurant-backend

# Stop backend
pm2 stop restaurant-backend

# Xem MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Xem Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Xem Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Restart Nginx
sudo systemctl restart nginx

# Kiểm tra disk space
df -h

# Kiểm tra RAM
free -h
```

### 10.2. Backup Database

```bash
# Tạo thư mục backup
mkdir -p ~/backups

# Backup MongoDB
mongodump --db restaurantDB --out ~/backups/backup-$(date +%Y%m%d-%H%M%S)

# Restore (nếu cần)
# mongorestore --db restaurantDB ~/backups/backup-YYYYMMDD-HHMMSS/restaurantDB
```

---

## 🎯 BƯỚC 11: AUTO DEPLOY KHI CÓ CODE MỚI

### 11.1. Tạo script deploy

```bash
cd /var/www/restaurant
nano deploy.sh
```

**Copy vào:**

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Pull latest code
git pull origin dev

# Backend
echo "📦 Updating backend..."
cd backend
npm install --production
pm2 restart restaurant-backend

# Admin
echo "🎨 Building admin..."
cd ../admin
npm install
npm run build

# Client
echo "🛒 Building client..."
cd ../client
npm install
npm run build

# Restart Nginx
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx

echo "✅ Deployment completed!"
pm2 logs restaurant-backend --lines 30
```

**Lưu và cấp quyền:**

```bash
chmod +x deploy.sh
```

### 11.2. Chạy deploy

```bash
cd /var/www/restaurant
./deploy.sh
```

---

## 📝 CHECKLIST HOÀN THÀNH

- [ ] VPS đã cài xong Node.js, MongoDB, PM2, Nginx
- [ ] Clone project thành công
- [ ] Backend chạy được với PM2
- [ ] Admin build thành công
- [ ] Client build thành công
- [ ] Nginx config đúng
- [ ] Firewall đã cấu hình
- [ ] Website truy cập được qua browser
- [ ] Đăng nhập admin thành công
- [ ] SSL đã cài (nếu có domain)

---

## 🆘 TROUBLESHOOTING

### Lỗi: "Cannot connect to MongoDB"

```bash
# Kiểm tra MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Xem logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Lỗi: "502 Bad Gateway"

```bash
# Kiểm tra backend có chạy không
pm2 status

# Restart backend
pm2 restart restaurant-backend

# Xem logs
pm2 logs restaurant-backend
```

### Lỗi: "npm install failed"

```bash
# Thử với --legacy-peer-deps
npm install --legacy-peer-deps

# Hoặc xóa node_modules và thử lại
rm -rf node_modules package-lock.json
npm install
```

### Lỗi: "Permission denied"

```bash
# Cấp quyền cho thư mục
sudo chown -R $USER:$USER /var/www/restaurant
```

### Frontend không load được

```bash
# Kiểm tra Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Xem logs
sudo tail -f /var/log/nginx/error.log
```

### WebSocket không kết nối được

```bash
# Kiểm tra Nginx config có location /ws chưa
sudo cat /etc/nginx/sites-available/restaurant | grep -A 10 "location /ws"

# Kiểm tra backend có chạy WebSocket không
pm2 logs restaurant-backend | grep -i websocket

# Test WebSocket connection từ server
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" http://localhost:5000/ws

# Kiểm tra Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Kiểm tra firewall có chặn WebSocket không
sudo ufw status

# Restart Nginx sau khi sửa config
sudo nginx -t && sudo systemctl restart nginx
```

**Lưu ý:** Đảm bảo Nginx config có location `/ws` với đầy đủ WebSocket upgrade headers như trong hướng dẫn.

---

## 📞 SUPPORT

Nếu gặp vấn đề:

1. Kiểm tra logs: `pm2 logs restaurant-backend`
2. Kiểm tra Nginx: `sudo nginx -t`
3. Kiểm tra MongoDB: `sudo systemctl status mongod`
4. Kiểm tra Firewall: `sudo ufw status`

---

**Chúc bạn deploy thành công! 🎉**
