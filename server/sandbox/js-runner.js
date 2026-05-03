#!/usr/bin/env node
/**
 * JavaScript 受限执行器
 *
 * 在独立 Node 进程中运行 LLM 生成的 JS 代码,通过 vm.runInNewContext
 * 提供基础隔离. 相比主进程 eval 更安全,但不如完整 VM/容器隔离. 
 *
 * 安全限制：
 * - 无 require/import(模块系统未暴露)
 * - 无 process、fs、os、path 等 Node 内置模块
 * - 无网络访问(fetch/XMLHttpRequest 未暴露)
 * - 执行超时由 vm 控制
 *
 * 适用场景：简单计算、数据转换、JSON 处理
 * 不适用：执行不可信/恶意代码(需 Monty 或容器级沙箱)
 */

const vm = require('vm');

const code = process.argv[2] || '';
const inputsJson = process.argv[3] || '{}';

let inputs = {};
try {
  inputs = JSON.parse(inputsJson);
} catch (e) {
  console.log(JSON.stringify({
    success: false,
    error: `Invalid inputs JSON: ${e.message}`
  }));
  process.exit(1);
}

const context = {
  ...inputs,
  console: {
    log: (...args) => { console._logs.push(args.map(a => String(a)).join(' ')); },
    error: (...args) => { console._errors.push(args.map(a => String(a)).join(' ')); },
    _logs: [],
    _errors: [],
  },
  Math, JSON, Date, Array, Object, String, Number, Boolean,
  RegExp, Map, Set, WeakMap, WeakSet, Promise,
  Error, TypeError, RangeError, SyntaxError, ReferenceError,
  parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
  Infinity, NaN, undefined,
  setTimeout: () => { throw new Error('setTimeout is not allowed in sandbox'); },
  clearTimeout: () => { },
  setInterval: () => { throw new Error('setInterval is not allowed in sandbox'); },
  clearInterval: () => { },
};

const EXEC_TIMEOUT = 10000;

try {
  const script = new vm.Script(code, { timeout: EXEC_TIMEOUT });
  const result = script.runInNewContext(context, { timeout: EXEC_TIMEOUT });

  console.log(JSON.stringify({
    success: true,
    result: result === undefined ? null : result,
    stdout: context.console._logs.join('\n'),
    stderr: context.console._errors.join('\n'),
  }, (key, value) => {
    if (typeof value === 'function') return '[Function]';
    if (value instanceof Error) return value.message;
    return value;
  }));
} catch (error) {
  console.log(JSON.stringify({
    success: false,
    error: error instanceof Error ? error.message : String(error),
    stdout: context.console._logs.join('\n'),
    stderr: context.console._errors.join('\n'),
  }));
  process.exit(1);
}
