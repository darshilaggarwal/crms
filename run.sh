#!/usr/bin/env bash
# ==============================================================================
# CMRS - Cash Management & Reconciliation System
# 1-Click Startup Script for Evaluation
# ==============================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "============================================================"
echo "🏦 Starting ARTH CMRS (Cash Management & Reconciliation)"
echo "============================================================"

# Activate virtualenv
source venv/bin/activate

# Apply migrations
echo "🔄 Checking database migrations..."
cd backend
python manage.py migrate --no-input

# Rebuild frontend if dist does not exist
if [ ! -d "../frontend/dist" ]; then
    echo "📦 Building React frontend..."
    cd ../frontend
    npm run build
    cd ../backend
fi

echo ""
echo "============================================================"
echo "✅ CMRS SERVER READY!"
echo "============================================================"
echo "🌐 Web Dashboard:  http://localhost:8000/"
echo "📖 Swagger Docs:   http://localhost:8000/api/docs/"
echo "🛠️  Django Admin:   http://localhost:8000/admin/"
echo ""
echo "🔑 Test Credentials (password: pass1234):"
echo "   • Head Office Admin:    admin"
echo "   • Branch Manager:       manager_priya"
echo "   • Collection Agent 1:   agent_suresh"
echo "   • Collection Agent 2:   agent_mohan"
echo "============================================================"
echo ""

# Start Django server
python manage.py runserver 0.0.0.0:8000
