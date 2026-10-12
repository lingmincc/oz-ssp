import test from 'node:test';
import assert from 'node:assert/strict';

// 最小测试能力自检：确认 node:test 运行器与断言在本仓库可用
test('harness: node:test runner works', () => {
  assert.equal(typeof test, 'function');
  assert.equal(1 + 1, 2);
});
