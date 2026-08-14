#!/bin/bash
# PlanToPark Backend Auto-Deploy Script for Ubuntu EC2
# Run this after SSHing into your EC2 instance

set -e

echo "========================================"
echo " PlanToPark Backend Deployment Script"
echo "========================================"

# Update system
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install PM2 globally
sudo npm install -g pm2

# Install git
sudo apt-get install -y git

# Clone the backend repo
cd /home/ubuntu
if [ -d "parking" ]; then
  echo "Repo already exists, pulling latest..."
  cd parking
  git pull origin main
else
  echo "Cloning repo..."
  git clone https://github.com/hrzewotech-lab/parking.git
  cd parking
fi

# Go to backend directory (adjust if needed)
if [ -d "backend" ]; then
  cd backend
fi

# Install dependencies
npm install --production

# Create .env file
cat > .env << 'EOF'
PORT=5000
MONGODB_URI=REPLACE_WITH_YOUR_MONGODB_URI
JWT_SECRET=plantoparksecretkey2024
NODE_ENV=production
EOF

echo ""
echo "⚠️  IMPORTANT: Edit the .env file with your MongoDB connection string!"
echo "Run: nano .env"
echo ""

# Start with PM2
pm2 start server.js --name plantopark-backend
pm2 startup
pm2 save

echo ""
echo "========================================"
echo " Backend deployed! Testing..."
echo "========================================"
sleep 3
curl -s http://localhost:5000 || echo "Server starting up..."
echo ""
echo "✅ Done! Your backend is running on port 5000"
echo "Public IP will be shown in EC2 console"
