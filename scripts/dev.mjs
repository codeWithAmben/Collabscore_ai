import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function pipePrefixed(stream, prefix, target) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.length > 0) {
        target.write(`[${prefix}] ${line}\n`);
      }
    }
  });
  stream.on('end', () => {
    if (buffer.length > 0) {
      target.write(`[${prefix}] ${buffer}\n`);
    }
  });
}

const backend = spawn(process.execPath, ['--watch', 'src/index.js'], {
  cwd: path.join(ROOT_DIR, 'backend'),
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe']
});

const frontend = spawn(
  process.execPath,
  [path.join(ROOT_DIR, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js'), '--host'],
  {
    cwd: path.join(ROOT_DIR, 'frontend'),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
  }
);

pipePrefixed(backend.stdout, 'backend', process.stdout);
pipePrefixed(backend.stderr, 'backend', process.stderr);
pipePrefixed(frontend.stdout, 'frontend', process.stdout);
pipePrefixed(frontend.stderr, 'frontend', process.stderr);

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  backend.kill();
  frontend.kill();
  setTimeout(() => process.exit(code), 150);
}

backend.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`[dev] Backend exited with code ${code}`);
    shutdown(code ?? 1);
  }
});

frontend.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`[dev] Frontend exited with code ${code}`);
    shutdown(code ?? 1);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
