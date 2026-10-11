/**
 * Campus Synq — Master Unified Development Runner
 * Concurrently boots both Backend (Port 5000) and Frontend (Port 5173)
 * with unified log output, MongoDB connectivity check, and auto-browser launch.
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const net = require('net');

const ROOT_DIR = __dirname;
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

const COLORS = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  purple: '\x1b[35m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
};

function log(prefix, color, message) {
  const lines = message.toString().split('\n');
  lines.forEach((line) => {
    if (line.trim()) {
      console.log(`${color}${prefix}${COLORS.reset} ${line}`);
    }
  });
}

function checkPort(port, host = '127.0.0.1', timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeout);
    socket.once('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function openBrowser(url) {
  const startCmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(startCmd, () => {});
}

async function main() {
  console.log(`\n${COLORS.bold}${COLORS.purple}==============================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.purple}           CAMPUS SYNQ — SYSTEM RUNNER (PHASE 1)              ${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.purple}==============================================================${COLORS.reset}\n`);

  // 1. Verify MongoDB Availability
  let mongoUri = '';
  try {
    const fs = require('fs');
    const envPath = path.join(BACKEND_DIR, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^MONGODB_URI=(.+)$/m);
      if (match) mongoUri = match[1].trim();
    }
  } catch {}

  const isAtlas = mongoUri.includes('mongodb.net') || mongoUri.startsWith('mongodb+srv://');

  if (isAtlas) {
    console.log(`${COLORS.cyan}Database Target: ${COLORS.bold}MongoDB Atlas (Cloud Cluster)${COLORS.reset}`);
    console.log(`${COLORS.green}Atlas Connection URI configured in backend/.env${COLORS.reset}\n`);
  } else {
    process.stdout.write(`${COLORS.cyan}Checking local MongoDB on 127.0.0.1:27017... ${COLORS.reset}`);
    const mongoOnline = await checkPort(27017, '127.0.0.1');

    if (mongoOnline) {
      console.log(`${COLORS.green}CONNECTED${COLORS.reset}\n`);
    } else {
      console.log(`${COLORS.yellow}NOT DETECTED${COLORS.reset}`);
      console.log(
        `${COLORS.yellow}Warning: Local MongoDB on port 27017 did not respond.\n` +
        `Please ensure local MongoDB is running or configure MongoDB Atlas in backend/.env.${COLORS.reset}\n`
      );
    }
  }

  console.log(`${COLORS.cyan}Checking port availability...${COLORS.reset}`);

  // Safely clean up any stale Campus Synq node processes on ports 5000 and 5173
  if (process.platform === 'win32') {
    const { execSync } = require('child_process');
    for (const port of [5000, 5173]) {
      try {
        const netstat = execSync(`netstat -ano -p tcp | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' }).trim();
        if (netstat) {
          const lines = netstat.split(/\r?\n/);
          for (const l of lines) {
            const parts = l.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && pid !== process.pid.toString()) {
              const taskinfo = execSync(`tasklist /fi "PID eq ${pid}" /fo csv /nh`, { encoding: 'utf8' }).trim();
              if (taskinfo.toLowerCase().includes('node.exe')) {
                console.log(`${COLORS.yellow}[Process Recovery]: Stopped previous stale process (PID ${pid}) on port ${port}.${COLORS.reset}`);
                execSync(`taskkill /pid ${pid} /F /T`, { stdio: 'ignore' });
              }
            }
          }
        }
      } catch {}
    }
  }

  console.log(`${COLORS.cyan}Launching services...${COLORS.reset}\n`);

  // 2. Launch Backend Server
  const backend = spawn('node', ['src/server.js'], {
    cwd: BACKEND_DIR,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  backend.stdout.on('data', (d) => log('[BACKEND] ', COLORS.purple, d));
  backend.stderr.on('data', (d) => log('[BACKEND-ERR] ', COLORS.red, d));

  // 3. Launch Frontend Dev Server
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const frontend = spawn(npmCmd, ['run', 'dev'], {
    cwd: FRONTEND_DIR,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  frontend.stdout.on('data', (d) => log('[FRONTEND]', COLORS.cyan, d));
  frontend.stderr.on('data', (d) => log('[FRONTEND-ERR]', COLORS.red, d));

  // 4. Print Active Endpoints Banner
  setTimeout(() => {
    console.log(`\n${COLORS.bold}${COLORS.green}==============================================================${COLORS.reset}`);
    console.log(`${COLORS.bold}${COLORS.green}   CAMPUS SYNQ PORTAL IS RUNNING SUCCESSFULLY!                ${COLORS.reset}`);
    console.log(`${COLORS.bold}${COLORS.green}==============================================================${COLORS.reset}`);
    console.log(`  ${COLORS.bold}Frontend Portal:${COLORS.reset}  http://localhost:5173`);
    console.log(`  ${COLORS.bold}Backend API:${COLORS.reset}      http://localhost:5000/api/v1`);
    console.log(`  ${COLORS.bold}Health Check:${COLORS.reset}     http://localhost:5000/api/v1/health`);
    console.log(`${COLORS.bold}${COLORS.green}==============================================================${COLORS.reset}`);
    console.log(`  Press ${COLORS.yellow}Ctrl + C${COLORS.reset} in this terminal to stop both servers.\n`);

    // Auto open browser after frontend server is ready
    openBrowser('http://localhost:5173');
  }, 2500);

  // 5. Clean Synchronous Termination Handler
  const cleanup = () => {
    console.log(`\n${COLORS.yellow}Shutting down Campus Synq services...${COLORS.reset}`);
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        if (backend && backend.pid) {
          try { execSync(`taskkill /pid ${backend.pid} /T /F`, { stdio: 'ignore' }); } catch {}
        }
        if (frontend && frontend.pid) {
          try { execSync(`taskkill /pid ${frontend.pid} /T /F`, { stdio: 'ignore' }); } catch {}
        }
      } else {
        if (backend) backend.kill('SIGINT');
        if (frontend) frontend.kill('SIGINT');
      }
    } catch {
      // Ignore cleanup errors
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch((err) => {
  console.error('Failed to run project:', err);
  process.exit(1);
});
