import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAPTCHA_CHARSET,
  generateCaptcha,
  captchaMatches,
  escapeHtml,
  validateUsername,
  validatePassword,
  validateLoginForm,
} from '../assets/js/login.mjs';

// —— 随机验证码 ——

test('generateCaptcha: 默认生成4位、字符全部来自安全字符集', () => {
  const code = generateCaptcha();
  assert.equal(code.length, 4);
  for (const ch of code) {
    assert.ok(CAPTCHA_CHARSET.includes(ch), `非法字符: ${ch}`);
  }
});

test('generateCaptcha: 字符集排除易混淆字符 0/O/1/l/I', () => {
  for (const bad of ['0', 'O', '1', 'l', 'I']) {
    assert.ok(!CAPTCHA_CHARSET.includes(bad), `字符集不应包含 ${bad}`);
  }
});

test('generateCaptcha: 支持自定义长度', () => {
  assert.equal(generateCaptcha({ length: 6 }).length, 6);
});

test('generateCaptcha: 注入确定性 rng 时输出可预期', () => {
  const code = generateCaptcha({ length: 4, rng: () => 0 });
  assert.equal(code, CAPTCHA_CHARSET[0].repeat(4));
});

test('generateCaptcha: 连续生成20次不全部相同（随机性）', () => {
  const codes = new Set(Array.from({ length: 20 }, () => generateCaptcha()));
  assert.ok(codes.size > 1, '20次生成结果不应完全相同');
});

// —— 验证码比对 ——

test('captchaMatches: 忽略大小写与首尾空白', () => {
  assert.equal(captchaMatches(' Ab34 ', 'aB34'), true);
});

test('captchaMatches: 不匹配、空输入、空期望、非字符串均判失败', () => {
  assert.equal(captchaMatches('ab35', 'aB34'), false);
  assert.equal(captchaMatches('', 'aB34'), false);
  assert.equal(captchaMatches('aB34', ''), false);
  assert.equal(captchaMatches(null, 'aB34'), false);
  assert.equal(captchaMatches('aB34', undefined), false);
});

// —— XSS 转义 ——

test('escapeHtml: 转义 & < > " \' 防止 XSS', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('1')">&`),
    '&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;',
  );
});

test('escapeHtml: 普通文本原样保留，null/undefined 转空串', () => {
  assert.equal(escapeHtml('abc 123'), 'abc 123');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

// —— 用户名/密码校验 ——

test('validateUsername: 合法用户名通过', () => {
  assert.equal(validateUsername('user_1').valid, true);
  assert.equal(validateUsername('  admin@example.com  ').valid, true);
});

test('validateUsername: 空、超长、含非法字符被拒绝并给出错误信息', () => {
  assert.equal(validateUsername('').valid, false);
  assert.equal(validateUsername('   ').valid, false);
  assert.equal(validateUsername('a'.repeat(33)).valid, false);
  assert.equal(validateUsername('us er').valid, false);
  assert.ok(validateUsername('').error.length > 0);
});

test('validatePassword: 长度6-64的密码通过', () => {
  assert.equal(validatePassword('secret1').valid, true);
  assert.equal(validatePassword('a'.repeat(6)).valid, true);
});

test('validatePassword: 空、过短、过长被拒绝并给出错误信息', () => {
  assert.equal(validatePassword('').valid, false);
  assert.equal(validatePassword('12345').valid, false);
  assert.equal(validatePassword('a'.repeat(65)).valid, false);
  assert.ok(validatePassword('12345').error.length > 0);
});

// —— 表单整体校验 ——

test('validateLoginForm: 全部合法时通过且无错误', () => {
  const r = validateLoginForm({
    username: 'user_1',
    password: 'secret1',
    captcha: 'AB34',
    expectedCaptcha: 'ab34',
  });
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, {});
});

test('validateLoginForm: 验证码错误时拒绝并返回 captcha 错误', () => {
  const r = validateLoginForm({
    username: 'user_1',
    password: 'secret1',
    captcha: 'ZZ99',
    expectedCaptcha: 'ab34',
  });
  assert.equal(r.valid, false);
  assert.ok(r.errors.captcha);
});

test('validateLoginForm: 多项非法时聚合返回全部错误', () => {
  const r = validateLoginForm({
    username: '',
    password: '123',
    captcha: '',
    expectedCaptcha: 'ab34',
  });
  assert.equal(r.valid, false);
  assert.ok(r.errors.username);
  assert.ok(r.errors.password);
  assert.ok(r.errors.captcha);
});
