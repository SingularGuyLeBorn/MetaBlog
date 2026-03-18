#!/usr/bin/env node

/**
 * 结构检查器 - Structure Checker
 * 
 * 自动检查并补齐文件夹结构
 * 规则：
 *   1. 优先检查是否存在 foldername.md
 *   2. 其次检查是否存在 index.md
 *   3. 如果两者都不存在，则创建 foldername.md
 * 
 * 用法: node scripts/structure-checker.js [选项] [目标路径]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(type, message) {
  const prefix = {
    info: `${colors.cyan}[INFO]${colors.reset}`,
    success: `${colors.green}[OK]${colors.reset}`,
    warning: `${colors.yellow}[WARN]${colors.reset}`,
    error: `${colors.red}[ERROR]${colors.reset}`,
    created: `${colors.green}[CREATED]${colors.reset}`
  }[type] || '[LOG]';
  console.log(`${prefix} ${message}`);
}

/**
 * 检查并创建文件夹的入口 .md 文件
 * 优先级: foldername.md > index.md
 * @param {string} dirPath - 文件夹路径
 * @param {Object} options - 配置选项
 * @returns {Object} - 统计信息
 */
function checkAndCreateMd(dirPath, options = {}) {
  const { dryRun = false, verbose = false } = options;
  const stats = {
    checked: 0,
    created: 0,
    skipped: 0,
    errors: 0
  };

  function traverse(currentPath) {
    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      const folders = items.filter(item => item.isDirectory());

      for (const folder of folders) {
        const folderPath = path.join(currentPath, folder.name);
        const folderMdFile = `${folder.name}.md`;
        const indexMdFile = 'index.md';
        const folderMdPath = path.join(folderPath, folderMdFile);
        const indexMdPath = path.join(folderPath, indexMdFile);

        stats.checked++;

        // 检查是否存在 foldername.md 或 index.md
        const hasFolderMd = fs.existsSync(folderMdPath);
        const hasIndexMd = fs.existsSync(indexMdPath);

        if (!hasFolderMd && !hasIndexMd) {
          // 两者都不存在，创建 foldername.md
          if (!dryRun) {
            try {
              fs.writeFileSync(folderMdPath, '', 'utf8');
              stats.created++;
              log('created', `${path.relative(process.cwd(), folderMdPath)}`);
            } catch (err) {
              stats.errors++;
              log('error', `无法创建 ${folderMdPath}: ${err.message}`);
            }
          } else {
            log('warning', `[DRY-RUN] 需要创建: ${path.relative(process.cwd(), folderMdPath)}`);
          }
        } else {
          stats.skipped++;
          if (verbose) {
            if (hasFolderMd) {
              log('success', `已存在: ${path.relative(process.cwd(), folderMdPath)}`);
            } else if (hasIndexMd) {
              log('success', `已存在: ${path.relative(process.cwd(), indexMdPath)} (index.md)`);
            }
          }
        }

        // 递归检查子文件夹
        traverse(folderPath);
      }
    } catch (err) {
      stats.errors++;
      log('error', `读取目录失败 ${currentPath}: ${err.message}`);
    }

    return stats;
  }

  // 首先检查根目录本身
  const rootName = path.basename(dirPath);
  const rootFolderMd = path.join(dirPath, `${rootName}.md`);
  const rootIndexMd = path.join(dirPath, 'index.md');
  
  const hasRootFolderMd = fs.existsSync(rootFolderMd);
  const hasRootIndexMd = fs.existsSync(rootIndexMd);
  
  if (!hasRootFolderMd && !hasRootIndexMd) {
    if (!dryRun) {
      try {
        fs.writeFileSync(rootFolderMd, '', 'utf8');
        stats.created++;
        log('created', `${path.relative(process.cwd(), rootFolderMd)}`);
      } catch (err) {
        stats.errors++;
        log('error', `无法创建 ${rootFolderMd}: ${err.message}`);
      }
    } else {
      log('warning', `[DRY-RUN] 需要创建: ${path.relative(process.cwd(), rootFolderMd)}`);
    }
  }

  // 递归遍历所有子文件夹
  traverse(dirPath);

  return stats;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
${colors.cyan}结构检查器 - Structure Checker${colors.reset}

用法: node scripts/structure-checker.js [选项] [目标路径]

规则:
  • 优先检查 foldername.md
  • 其次接受 index.md
  • 都不存在时创建 foldername.md

选项:
  -h, --help       显示帮助信息
  -d, --dry-run    模拟运行，不实际创建文件
  -v, --verbose    显示详细信息

示例:
  node scripts/structure-checker.js
  node scripts/structure-checker.js docs/sections/knowledge/cs336
  node scripts/structure-checker.js --dry-run docs/sections/knowledge
  node scripts/structure-checker.js -v ./docs

如果没有指定目标路径，默认检查 docs/sections/knowledge/cs336
`);
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  
  // 解析参数
  const options = {
    dryRun: false,
    verbose: false
  };
  let targetPath = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '-h' || arg === '--help') {
      showHelp();
      process.exit(0);
    } else if (arg === '-d' || arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '-v' || arg === '--verbose') {
      options.verbose = true;
    } else if (!arg.startsWith('-')) {
      targetPath = arg;
    }
  }

  // 默认路径
  if (!targetPath) {
    targetPath = path.join(process.cwd(), 'docs', 'sections', 'knowledge', 'cs336');
  } else {
    // 解析相对路径
    targetPath = path.resolve(targetPath);
  }

  // 检查目标路径是否存在
  if (!fs.existsSync(targetPath)) {
    log('error', `目标路径不存在: ${targetPath}`);
    process.exit(1);
  }

  if (!fs.statSync(targetPath).isDirectory()) {
    log('error', `目标路径不是文件夹: ${targetPath}`);
    process.exit(1);
  }

  console.log(`\n${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.cyan}    结构检查器 - Structure Checker${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}\n`);
  
  log('info', `目标路径: ${path.relative(process.cwd(), targetPath)}`);
  log('info', `模式: ${options.dryRun ? '模拟运行 (dry-run)' : '实际执行'}`);
  console.log('');

  const startTime = Date.now();
  const stats = checkAndCreateMd(targetPath, options);
  const duration = Date.now() - startTime;

  // 输出统计信息
  console.log(`\n${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.cyan}              统计信息${colors.reset}`);
  console.log(`${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.gray}检查文件夹数:${colors.reset} ${stats.checked}`);
  console.log(`${colors.green}创建文件数:${colors.reset}   ${stats.created}`);
  console.log(`${colors.gray}跳过文件数:${colors.reset}   ${stats.skipped}`);
  if (stats.errors > 0) {
    console.log(`${colors.red}错误数:${colors.reset}       ${stats.errors}`);
  }
  console.log(`${colors.gray}耗时:${colors.reset}         ${duration}ms`);
  console.log(`${colors.cyan}========================================${colors.reset}\n`);

  // 退出码
  process.exit(stats.errors > 0 ? 1 : 0);
}

// 运行
main();
