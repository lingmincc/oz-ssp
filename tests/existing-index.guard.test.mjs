import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// 特征守卫：锁定修改前既有唯一页面 index.html 的旧行为（占位个人主页）。
// 本次任务为纯新增登录页；该守卫确保既有页面内容不被本轮改动破坏。
// 基线版本：master@bee8c9cc9ca837fd32355570bbfe636e35f62214（修改前实际运行，见 evidence 日志）。
test('characterization guard: existing index.html placeholder page unchanged', () => {
  const html = readFileSync(join(repoRoot, 'index.html'), 'utf8');
  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /<h1>我的个人主页<\/h1>/);
  assert.match(html, /<p>这是我的第一个 Git 项目。<\/p>/);
});
