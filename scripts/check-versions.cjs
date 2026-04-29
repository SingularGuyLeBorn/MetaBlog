/**
 * 依赖版本扫描工具
 * 检查 package.json / requirements.txt 中的版本是否与实际安装的一致
 *
 * 用法：node scripts/check-versions.cjs
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let hasError = false;

// ==================== Node.js (package.json) ====================

function checkNodeVersions() {
  const pkgPath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  console.log('\n📦 Node.js 依赖检查\n');

  for (const section of ['dependencies', 'devDependencies']) {
    const deps = pkg[section];
    if (!deps) continue;

    for (const [name, spec] of Object.entries(deps)) {
      if (spec.startsWith('^') || spec.startsWith('>=') || spec.startsWith('~')) {
        console.log(`${RED}[未锁定]${RESET} ${name}: ${spec} (必须使用精确版本)`);
        hasError = true;
        continue;
      }

      try {
        const installedPath = path.join(process.cwd(), 'node_modules', name, 'package.json');
        const installed = JSON.parse(fs.readFileSync(installedPath, 'utf8'));

        if (installed.version !== spec) {
          console.log(`${YELLOW}[版本漂移]${RESET} ${name}: 声明=${spec} 实际=${installed.version}`);
          hasError = true;
        } else {
          console.log(`${GREEN}[一致]${RESET} ${name}@${spec}`);
        }
      } catch (e) {
        console.log(`${RED}[未安装]${RESET} ${name}@${spec}`);
        hasError = true;
      }
    }
  }
}

// ==================== Python (requirements.txt) ====================

function checkPythonVersions() {
  const reqFiles = [
    'project/experiments/feishu-api/requirements.txt',
    'project/experiments/yuque-api/requirements.txt',
    'project/experiments/github-api/requirements.txt',
  ];

  console.log('\n🐍 Python 依赖检查\n');

  for (const reqFile of reqFiles) {
    const fullPath = path.join(process.cwd(), reqFile);
    if (!fs.existsSync(fullPath)) continue;

    const lines = fs.readFileSync(fullPath, 'utf8').split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.includes('>=') || trimmed.includes('^') || trimmed.includes('~')) {
        console.log(`${RED}[未锁定]${RESET} ${reqFile}: ${trimmed}`);
        hasError = true;
      } else if (trimmed.includes('==')) {
        console.log(`${GREEN}[已锁定]${RESET} ${reqFile}: ${trimmed}`);
      }
    }
  }
}

// ==================== Main ====================

checkNodeVersions();
checkPythonVersions();

console.log('\n' + (hasError ? `${RED}❌ 发现版本问题，请修复后再提交${RESET}` : `${GREEN}✅ 所有依赖版本一致且已锁定${RESET}`) + '\n');
process.exit(hasError ? 1 : 0);
