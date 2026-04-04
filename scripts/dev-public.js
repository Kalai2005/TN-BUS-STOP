import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const projectRoot = process.cwd();
const publicUrlFile = path.resolve(projectRoot, '.public-url');
const cloudflaredPath = path.resolve(projectRoot, '.tools', 'cloudflared.exe');
const port = Number(process.env.PORT || 5000);

const writePublicUrl = (url) => {
  fs.writeFileSync(publicUrlFile, `${String(url || '').trim()}\n`, 'utf8');
};

const touchPublicUrl = () => {
  try {
    const now = new Date();
    fs.utimesSync(publicUrlFile, now, now);
  } catch {
    // Ignore while file is not ready.
  }
};

const clearPublicUrl = () => {
  try {
    fs.unlinkSync(publicUrlFile);
  } catch {
    // Ignore missing file on shutdown.
  }
};

const server = spawn(process.execPath, ['server.js'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
});

let publicUrl = '';
let shuttingDown = false;
let keepAliveTimer = null;

const tunnel = spawn(cloudflaredPath, [
  'tunnel',
  '--url', `http://127.0.0.1:${port}`,
  '--no-autoupdate',
], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NO_COLOR: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

const captureUrl = (chunk) => {
  const text = String(chunk || '');
  const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (match && !publicUrl) {
    publicUrl = match[0];
    writePublicUrl(publicUrl);
    keepAliveTimer = setInterval(touchPublicUrl, 15 * 1000);
    if (typeof keepAliveTimer.unref === 'function') {
      keepAliveTimer.unref();
    }
    console.log(`Public ticket URL: ${publicUrl}`);
    console.log(`QR tickets will use: ${publicUrl}/api/bookings/public/<bookingId>`);
  }
};

tunnel.stdout.on('data', captureUrl);
tunnel.stderr.on('data', captureUrl);

tunnel.on('error', (error) => {
  console.error('Cloudflared tunnel failed:', error.message);
  void shutdown();
});

const shutdown = async () => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  clearPublicUrl();
  if (!tunnel.killed) {
    tunnel.kill();
  }
  if (!server.killed) {
    server.kill();
  }
};

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

server.on('exit', async () => {
  await shutdown();
  process.exit(0);
});

tunnel.on('exit', async (code) => {
  if (code !== 0) {
    console.error(`Cloudflared exited with code ${code}`);
  }
  await shutdown();
  process.exit(code ?? 0);
});