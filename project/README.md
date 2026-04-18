# SocialHub - Setup Instructions

## 1. Clone & Setup
```bash
git clone https://github.com/your-repo/socialhub.git
cd socialhub
```

## 2. Setup environment
```bash
bash setup-env.sh
```

## 3. Edit configuration
```bash
nano .env
nano backend/.env
```

## 4. Install dependencies
```bash
npm install
cd backend && npm install && cd ..
```

## 5. Start MongoDB (in another terminal)
```bash
mongod
```

## 6. Start backend
```bash
cd backend
npm run dev
```

## 7. Start frontend (in another terminal)
```bash
npm start
```

## 8. Access app
- **Frontend:** http://localhost:3001
- **Backend:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/docs
