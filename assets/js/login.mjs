// 媒体自助平台 · 登录页前端逻辑（纯前端，无后端依赖）
// 安全要点：CSP 限制脚本来源；验证码使用 crypto 加密随机源；
// 所有用户输入回显一律经 textContent/escapeHtml，不使用 innerHTML；
// 验证码一次性使用（每次提交后重新生成）；提交后重置表单，不留明文残留。

export const CAPTCHA_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const USERNAME_PATTERN = /^[\w.\-@]{1,32}$/u;
const CAPTCHA_COLORS = ['#1f3a93', '#8e44ad', '#16a085', '#c0392b', '#2c3e50'];

function secureRandomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  let value;
  do {
    value = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  } while (value >= limit);
  return value % max;
}

export function generateCaptcha(options = {}) {
  const { length = 4, charset = CAPTCHA_CHARSET, rng = secureRandomInt } = options;
  if (!Number.isInteger(length) || length < 1 || length > 32) {
    throw new RangeError('验证码长度必须为 1-32 的整数');
  }
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += charset[rng(charset.length)];
  }
  return code;
}

export function captchaMatches(input, expected) {
  if (typeof input !== 'string' || typeof expected !== 'string') return false;
  const normalizedInput = input.trim().toLowerCase();
  const normalizedExpected = expected.trim().toLowerCase();
  if (!normalizedInput || !normalizedExpected) return false;
  return normalizedInput === normalizedExpected;
}

export function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function validateUsername(value) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!trimmed) return { valid: false, error: '请输入用户名' };
  if (!USERNAME_PATTERN.test(trimmed)) {
    return { valid: false, error: '用户名为 1-32 位字母、数字或 _ . - @ 字符' };
  }
  return { valid: true };
}

export function validatePassword(value) {
  const password = typeof value === 'string' ? value : '';
  if (!password) return { valid: false, error: '请输入密码' };
  if (password.length < 6) return { valid: false, error: '密码长度至少 6 位' };
  if (password.length > 64) return { valid: false, error: '密码长度不能超过 64 位' };
  return { valid: true };
}

export function validateLoginForm({ username, password, captcha, expectedCaptcha } = {}) {
  const errors = {};
  const usernameResult = validateUsername(username);
  if (!usernameResult.valid) errors.username = usernameResult.error;
  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) errors.password = passwordResult.error;
  if (!captchaMatches(captcha, expectedCaptcha)) errors.captcha = '验证码错误或已失效';
  return { valid: Object.keys(errors).length === 0, errors };
}

function drawCaptcha(canvas, code) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f4f6fb';
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 4; i += 1) {
    ctx.strokeStyle = CAPTCHA_COLORS[secureRandomInt(CAPTCHA_COLORS.length)];
    ctx.beginPath();
    ctx.moveTo(secureRandomInt(width), secureRandomInt(height));
    ctx.lineTo(secureRandomInt(width), secureRandomInt(height));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.font = 'bold 24px sans-serif';
  ctx.textBaseline = 'middle';
  const step = width / (code.length + 1);
  for (let i = 0; i < code.length; i += 1) {
    ctx.save();
    ctx.translate(step * (i + 1), height / 2 + (secureRandomInt(9) - 4));
    ctx.rotate(((secureRandomInt(61) - 30) * Math.PI) / 180);
    ctx.fillStyle = CAPTCHA_COLORS[secureRandomInt(CAPTCHA_COLORS.length)];
    ctx.fillText(code[i], -8, 0);
    ctx.restore();
  }
}

export function initLoginPage(doc = globalThis.document) {
  if (!doc) return;
  const form = doc.getElementById('login-form');
  if (!form) return;

  const usernameInput = doc.getElementById('username');
  const passwordInput = doc.getElementById('password');
  const captchaInput = doc.getElementById('captcha');
  const canvas = doc.getElementById('captcha-canvas');
  const refreshButton = doc.getElementById('captcha-refresh');
  const toggleButton = doc.getElementById('toggle-password');
  const statusElement = doc.getElementById('form-status');
  const errorElements = {
    username: doc.getElementById('username-error'),
    password: doc.getElementById('password-error'),
    captcha: doc.getElementById('captcha-error'),
  };

  let currentCaptcha = '';

  function refreshCaptcha() {
    currentCaptcha = generateCaptcha();
    drawCaptcha(canvas, currentCaptcha);
    captchaInput.value = '';
  }

  function renderErrors(errors) {
    for (const [field, element] of Object.entries(errorElements)) {
      const message = errors[field] ?? '';
      element.textContent = message;
      const input = field === 'username' ? usernameInput : field === 'password' ? passwordInput : captchaInput;
      if (message) {
        input.setAttribute('aria-invalid', 'true');
      } else {
        input.removeAttribute('aria-invalid');
      }
    }
  }

  for (const [field, input] of Object.entries({ username: usernameInput, password: passwordInput, captcha: captchaInput })) {
    input.addEventListener('input', () => {
      errorElements[field].textContent = '';
      input.removeAttribute('aria-invalid');
    });
  }

  refreshButton.addEventListener('click', refreshCaptcha);

  toggleButton.addEventListener('click', () => {
    const reveal = passwordInput.type === 'password';
    passwordInput.type = reveal ? 'text' : 'password';
    toggleButton.textContent = reveal ? '隐藏' : '显示';
    toggleButton.setAttribute('aria-pressed', String(reveal));
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = validateLoginForm({
      username: usernameInput.value,
      password: passwordInput.value,
      captcha: captchaInput.value,
      expectedCaptcha: currentCaptcha,
    });
    renderErrors(result.errors);
    if (result.valid) {
      statusElement.textContent = '验证通过：登录请求已就绪（本页面为纯前端演示，未连接后端）';
      statusElement.className = 'status success';
      form.reset();
    } else {
      statusElement.textContent = '请修正表单中标记的问题后重试';
      statusElement.className = 'status failure';
    }
    refreshCaptcha();
  });

  refreshCaptcha();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initLoginPage(document));
  } else {
    initLoginPage(document);
  }
}
