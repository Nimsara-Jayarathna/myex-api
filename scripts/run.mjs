import { spawn } from 'node:child_process';

const MODES = {
  dev: {
    command: 'nest',
    args: ['start', '--watch'],
    env: {
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug',
    },
  },
  debug: {
    command: 'nest',
    args: ['start', '--debug', '0.0.0.0:9229', '--watch'],
    env: {
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug',
      DEBUG_LOG_BODY: process.env.DEBUG_LOG_BODY ?? 'false',
    },
  },
  release: {
    command: 'node',
    args: ['dist/main.js'],
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    },
  },
  'release-debug': {
    command: 'node',
    args: ['--inspect=0.0.0.0:9229', 'dist/main.js'],
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'debug',
      DEBUG_LOG_BODY: process.env.DEBUG_LOG_BODY ?? 'false',
    },
  },
};

const mode = process.argv[2];
const selected = MODES[mode];

if (!selected) {
  console.error(`Unknown run mode "${mode}". Available modes: ${Object.keys(MODES).join(', ')}`);
  process.exit(1);
}

const child = spawn(selected.command, selected.args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    ...selected.env,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
