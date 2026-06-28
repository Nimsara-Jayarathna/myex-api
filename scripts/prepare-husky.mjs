import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const omit = process.env.npm_config_omit ?? '';
const isProductionInstall = process.env.NODE_ENV === 'production' || omit.includes('dev');
const hasGitDirectory = existsSync(resolve(process.cwd(), '.git'));

if (isProductionInstall || !hasGitDirectory) {
  process.exit(0);
}

const huskyBin = join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'husky.cmd' : 'husky',
);

if (!existsSync(huskyBin)) {
  console.warn('[prepare] Husky binary was not found. Skipping git hook setup.');
  process.exit(0);
}

const result =
  process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', `"${huskyBin}"`], {
        stdio: 'inherit',
        env: process.env,
      })
    : spawnSync(huskyBin, [], {
        stdio: 'inherit',
        env: process.env,
      });

if (result.error) {
  console.warn(`[prepare] Husky setup skipped: ${result.error.message}`);
  process.exit(0);
}

if (result.status !== 0) {
  console.warn(`[prepare] Husky setup exited with code ${result.status}. Continuing install.`);
}

process.exit(0);
