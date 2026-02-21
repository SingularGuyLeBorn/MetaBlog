import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

function getTypeScriptOutput() {
    try {
        execSync('npx tsc --noEmit', {
            encoding: 'utf-8',
            stdio: 'pipe',
            cwd: process.cwd()
        });
        return '';
    } catch (error) {
        return error.stdout || error.stderr || error.message || '';
    }
}

function parseErrors(output) {
    const errors = [];
    // 统一处理换行符
    const lines = output.replace(/\r\n/g, '\n').split('\n');

    let currentError = null;
    let buffer = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 核心正则：匹配错误行（兼容各种路径格式）
        // 匹配：path(line,col): error TSxxxx: message 或 path(line,col): error TSxxxx message
        const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+)[:=]?\s*(.*)$/);

        if (match) {
            // 保存之前的错误
            if (currentError) {
                currentError.raw = buffer.join('\n');
                errors.push(currentError);
                buffer = [];
            }

            const [, filePath, lineNum, colNum, severity, code, message] = match;
            currentError = {
                filePath: filePath.trim(),
                line: parseInt(lineNum),
                column: parseInt(colNum),
                severity,
                code,
                message: message.trim(),
                details: [],
                raw: line
            };
            buffer.push(line);
        } else if (currentError) {
            // 收集属于当前错误的后续行（缩进的详细信息）
            buffer.push(line);

            // 如果是缩进的内容，归为 details
            if (line.match(/^  +/)) {
                currentError.details.push(line.trim());
            }

            // 如果遇到空行或下一个文件路径，结束当前错误
            if (line.match(/^[a-zA-Z]:\\/) || line.match(/^\.\./) || line === '') {
                // 可能是新错误的开始，先保存
                if (buffer.length > 1) {
                    currentError.raw = buffer.join('\n');
                }
            }
        }
    }

    // 最后一个错误
    if (currentError) {
        currentError.raw = buffer.join('\n');
        errors.push(currentError);
    }

    return errors;
}

function getSourceCode(filePath, lineNum, contextLines = 3) {
    try {
        // 尝试多种路径解析方式
        let fullPath = filePath;
        if (!path.isAbsolute(filePath)) {
            fullPath = path.resolve(process.cwd(), filePath);
        }

        if (!fs.existsSync(fullPath)) {
            // 尝试去掉 ../ 前缀
            if (filePath.startsWith('../')) {
                fullPath = path.resolve(process.cwd(), filePath.substring(3));
            }
            // 如果还不存在，返回错误
            if (!fs.existsSync(fullPath)) {
                return { source: `// 文件不存在: ${fullPath}`, context: [] };
            }
        }

        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split(/\r?\n/);

        if (lineNum < 1 || lineNum > lines.length) {
            return { source: '// 行号超出范围', context: [] };
        }

        const start = Math.max(0, lineNum - contextLines - 1);
        const end = Math.min(lines.length, lineNum + contextLines);
        const context = lines.slice(start, end).map((code, idx) => ({
            lineNum: start + idx + 1,
            code: code || ' ',
            isErrorLine: (start + idx + 1) === lineNum
        }));

        return {
            source: lines[lineNum - 1]?.trim() || '// 无法读取',
            context,
            totalLines: lines.length
        };
    } catch (err) {
        return { source: `// 读取失败: ${err.message}`, context: [], error: err.message };
    }
}

function main() {
    console.log('🔍 正在扫描 TypeScript 错误...\n');

    const output = getTypeScriptOutput();

    // 调试：先显示原始输出的前500字符，确认拿到了数据
    if (!output || output.trim().length === 0) {
        console.log('✅ 没有发现 TypeScript 错误！');
        return;
    }

    console.log(`📄 原始输出长度: ${output.length} 字符`);
    console.log(`📝 原始输出前200字符预览:\n${output.substring(0, 200)}\n`);

    const errors = parseErrors(output);

    console.log(`📊 解析到 ${errors.length} 个错误\n`);

    if (errors.length === 0) {
        console.log('⚠️ 没有解析到错误，显示完整原始输出：\n');
        console.log(output);
        return;
    }

    errors.forEach((err, index) => {
        const { source, context } = getSourceCode(err.filePath, err.line, 2);

        console.log(`\n${'='.repeat(80)}`);
        console.log(`❌ [${index + 1}/${errors.length}] ${err.code}`);
        console.log(`📁 ${err.filePath}:${err.line}:${err.column}`);
        console.log(`${'-'.repeat(80)}`);
        console.log(`💬 ${err.message}`);

        // 显示详细信息（如果有嵌套类型错误）
        if (err.details.length > 0) {
            console.log(`📋 类型详情:`);
            err.details.slice(0, 5).forEach(d => { // 最多显示5行详情，避免刷屏
                if (d.length > 100) {
                    console.log(`   ${d.substring(0, 100)}...`);
                } else {
                    console.log(`   ${d}`);
                }
            });
        }

        // 显示源代码
        if (context.length > 0) {
            console.log(`\n💻 源代码:`);
            context.forEach(ctx => {
                const pointer = ctx.isErrorLine ? '>>>' : '   ';
                const lineStr = String(ctx.lineNum).padStart(3, '0');
                // 截断太长的行
                let code = ctx.code;
                if (code.length > 75) code = code.substring(0, 72) + '...';
                console.log(`${pointer} ${lineStr} | ${code}`);
            });
        } else {
            console.log(`\n💻 源代码: [无法读取或文件不存在]`);
        }

        // 标记列位置
        if (err.column > 0 && err.column < 80 && context.length > 0) {
            const spaces = '     | ' + ' '.repeat(Math.min(err.column - 1, 50));
            console.log(`${spaces}^`);
        }
    });

    // 保存完整 JSON
    const report = {
        summary: {
            total: errors.length,
            timestamp: new Date().toISOString(),
            cwd: process.cwd()
        },
        errors: errors.map(err => ({
            ...err,
            sourceCode: getSourceCode(err.filePath, err.line).source
        }))
    };

    fs.writeFileSync('ts-errors-full.json', JSON.stringify(report, null, 2));
    console.log(`\n\n📄 完整报告已保存: ts-errors-full.json`);
}

main();