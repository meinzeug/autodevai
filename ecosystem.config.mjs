export default {
  apps: [
    {
      name: 'autodevai-app',
      script: './node_modules/.bin/tauri',
      args: 'dev',
      cwd: '/home/dennis/autodevai',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'development',
        RUST_BACKTRACE: 1
      },
      env_production: {
        NODE_ENV: 'production',
        RUST_BACKTRACE: 0
      },
      error_file: '/home/dennis/autodevai/logs/app-error.log',
      out_file: '/home/dennis/autodevai/logs/app-out.log',
      log_file: '/home/dennis/autodevai/logs/app-combined.log',
      time: true
    },
    
    // Development Docker Services
    {
      name: 'docker-dev-stack',
      script: 'docker-compose',
      args: '-f config/docker-compose.dev.yml up',
      cwd: '/home/dennis/autodevai',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      error_file: '/home/dennis/autodevai/logs/docker-dev-error.log',
      out_file: '/home/dennis/autodevai/logs/docker-dev-out.log',
      log_file: '/home/dennis/autodevai/logs/docker-dev-combined.log',
      time: true
    },

    // Monitoring Stack
    {
      name: 'docker-monitoring',
      script: 'docker-compose',
      args: '-f monitoring/docker-compose.monitoring.yml up',
      cwd: '/home/dennis/autodevai',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        GRAFANA_ADMIN_PASSWORD: 'autodev_monitoring_2024',
        DB_PASSWORD: 'autodev_db_secure_2024'
      },
      error_file: '/home/dennis/autodevai/logs/docker-monitoring-error.log',
      out_file: '/home/dennis/autodevai/logs/docker-monitoring-out.log',
      log_file: '/home/dennis/autodevai/logs/docker-monitoring-combined.log',
      time: true
    },

    // Production Docker Stack (optional - for production mode)
    {
      name: 'docker-prod-stack',
      script: 'docker-compose',
      args: '-f docker/docker-compose.yml up',
      cwd: '/home/dennis/autodevai',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '4G',
      env: {
        NODE_ENV: 'production',
        REDIS_PASSWORD: 'autodev_redis_secure_2024',
        POSTGRES_PASSWORD: 'autodev_postgres_secure_2024',
        GRAFANA_PASSWORD: 'autodev_grafana_secure_2024'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      error_file: '/home/dennis/autodevai/logs/docker-prod-error.log',
      out_file: '/home/dennis/autodevai/logs/docker-prod-out.log',
      log_file: '/home/dennis/autodevai/logs/docker-prod-combined.log',
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'dennis',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/meinzeug/autodevai.git',
      path: '/home/dennis/autodevai',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};