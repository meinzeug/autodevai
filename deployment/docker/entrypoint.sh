#!/bin/sh
set -e

# AutoDev-AI Neural Bridge Platform Entrypoint Script

echo "🚀 Starting AutoDev-AI Neural Bridge Platform..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
while ! nc -z postgres 5432; do
  echo "Database not ready, waiting 5 seconds..."
  sleep 5
done
echo "✅ Database connection established"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis connection..."
while ! nc -z redis 6379; do
  echo "Redis not ready, waiting 3 seconds..."
  sleep 3
done
echo "✅ Redis connection established"

# Run database migrations if needed
if [ "$NODE_ENV" = "production" ] && [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "🔄 Running database migrations..."
  npm run migrate || {
    echo "❌ Database migration failed"
    exit 1
  }
  echo "✅ Database migrations completed"
fi

# Initialize neural bridge if enabled
if [ "$NEURAL_BRIDGE_ENABLED" = "true" ]; then
  echo "🧠 Initializing Neural Bridge..."
  node -e "
    const { initializeNeuralBridge } = require('./src/neural/bridge');
    initializeNeuralBridge().catch(console.error);
  " || echo "⚠️ Neural Bridge initialization failed, continuing..."
fi

# Start sandbox manager in background if enabled
if [ "$ENABLE_SANDBOXES" = "true" ]; then
  echo "📦 Starting sandbox manager..."
  node scripts/sandbox-manager.js &
  SANDBOX_PID=$!
  echo "Sandbox manager started with PID: $SANDBOX_PID"
fi

# Setup signal handlers for graceful shutdown
shutdown_handler() {
  echo "🛑 Shutting down gracefully..."
  
  if [ ! -z "$SANDBOX_PID" ]; then
    echo "Stopping sandbox manager..."
    kill -TERM $SANDBOX_PID 2>/dev/null || true
    wait $SANDBOX_PID 2>/dev/null || true
  fi
  
  echo "Stopping main application..."
  kill -TERM $MAIN_PID 2>/dev/null || true
  wait $MAIN_PID 2>/dev/null || true
  
  echo "✅ Shutdown complete"
  exit 0
}

trap 'shutdown_handler' TERM INT

# Start the main application
echo "🎯 Starting main application..."
npm start &
MAIN_PID=$!

# Wait for the main process
wait $MAIN_PID