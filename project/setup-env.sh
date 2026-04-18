#!/bin/bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Environment Setup Script
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🔧 SocialHub Environment Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if .env files exist
if [ -f ".env" ]; then
    echo "✅ .env exists"
else
    echo "📋 Creating .env from template..."
    cp .env.template .env
    echo "✅ .env created"
fi

if [ -f "backend/.env" ]; then
    echo "✅ backend/.env exists"
else
    echo "📋 Creating backend/.env from template..."
    cp backend/.env.template backend/.env
    echo "✅ backend/.env created"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
cd backend && npm install && cd ..
echo "✅ Dependencies installed"

# Generate JWT secrets if not present
if ! grep -q "JWT_SECRET=" backend/.env; then
    echo ""
    echo "🔐 Generating JWT secrets..."
    JWT_SECRET=$(openssl rand -base64 32)
    REFRESH_SECRET=$(openssl rand -base64 32)
    
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" backend/.env
    sed -i "s/REFRESH_TOKEN_SECRET=.*/REFRESH_TOKEN_SECRET=$REFRESH_SECRET/" backend/.env
    
    echo "✅ JWT secrets generated"
fi

# Create MongoDB
echo ""
echo "🗄️  MongoDB Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Install MongoDB:"
echo "  macOS: brew install mongodb-community"
echo "  Ubuntu: sudo apt-get install -y mongodb"
echo "  Or use MongoDB Atlas: https://www.mongodb.com/cloud/atlas"

# Create Redis
echo ""
echo "🔄 Redis Setup (Optional - for caching)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Install Redis:"
echo "  macOS: brew install redis"
echo "  Ubuntu: sudo apt-get install -y redis-server"

# Create logs directory
mkdir -p logs
echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Edit .env and backend/.env with your configuration"
echo "  2. Start MongoDB: mongod"
echo "  3. Start Redis: redis-server (optional)"
echo "  4. Start backend: cd backend && npm start"
echo "  5. Start frontend: npm start"
echo ""
echo "🚀 Access app at: http://localhost:3001"
