import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const omit = process.env.npm_config_omit ?? '';
const isProductionInstall = process.env.NODE_ENV === 'production' || omit.includes('dev');

if (isProductionInstall || !existsSync('.git')) {
  process.exit(0);
}

const huskyBin = process.platform === 'win32' ? 'node_modules/.bin/husky.cmd' : 'node_modules/.bin/husky';

if (!existsSync(huskyBin)) {
  process.exit(0);
}

const result = spawnSync(huskyBin, [], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 0);
