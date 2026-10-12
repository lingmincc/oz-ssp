import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  const p = join(repoRoot, rel);
  assert.ok(existsSync(p), `缺少文件: ${rel}`);
  return readFileSync(p, 'utf8');
}

// 静态结构检查（可加载性静态核验；真实浏览器冒烟为 QA 部署后责任）

test('login.html: 存在且为 HTML5 文档，标题含登录', () => {
  const html = read('login.html');
  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /<title>[^<]*登录[^<]*<\/title>/);
});

test('login.html: 含用户名/密码/验证码输入及安全 autocomplete 属性', () => {
  const html = read('login.html');
  assert.match(html, /<input[^>]*id="username"[^>]*>/);
  assert.match(html, /<input[^>]*id="password"[^>]*type="password"[^>]*>/);
  assert.match(html, /autocomplete="username"/);
  assert.match(html, /autocomplete="current-password"/);
  assert.match(html, /<input[^>]*id="captcha"[^>]*>/);
  assert.match(html, /autocomplete="off"/);
});

test('login.html: 含验证码画布、刷新按钮、提交按钮与表单', () => {
  const html = read('login.html');
  assert.match(html, /id="captcha-canvas"/);
  assert.match(html, /<button[^>]*id="captcha-refresh"[^>]*>/);
  assert.match(html, /<form[^>]*id="login-form"[^>]*>/);
  assert.match(html, /type="submit"/);
});

test('login.html: 含 CSP meta，脚本均为外部 module（无内联脚本）', () => {
  const html = read('login.html');
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  const scripts = html.match(/<script\b[^>]*>/g) ?? [];
  assert.ok(scripts.length > 0, '应有脚本引用');
  for (const tag of scripts) {
    assert.match(tag, /src="/, `不允许内联脚本: ${tag}`);
  }
  assert.match(html, /<script[^>]*type="module"[^>]*src="[^"]*login\.mjs"[^>]*>/);
});

test('login.html: 引用外部样式 assets/css/login.css', () => {
  const html = read('login.html');
  assert.match(html, /<link[^>]*href="assets\/css\/login\.css"[^>]*>/);
});

test('配套静态资源存在：login.css 与 login.mjs', () => {
  read('assets/css/login.css');
  read('assets/js/login.mjs');
});

test('login.mjs: 不在代码中硬编码任何账号/密钥类敏感常量', () => {
  const js = read('assets/js/login.mjs');
  assert.ok(!/password\s*[:=]\s*['"][^'"]+['"]/i.test(js.replace(/expectedCaptcha|autocomplete/g, '')), '不应硬编码密码类常量');
  assert.ok(!/(api[_-]?key|secret|token)\s*[:=]\s*['"][^'"]+['"]/i.test(js), '不应硬编码密钥');
});
