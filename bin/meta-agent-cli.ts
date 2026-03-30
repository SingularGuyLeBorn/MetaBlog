#!/usr/bin/env node
/**
 * Meta-Agent CLI - 命令行工具
 * 
 * 使用方法:
 *   meta-agent status              # 查看所有 Agent 状态
 *   meta-agent start <agent-id>    # 启动 Agent
 *   meta-agent pause <agent-id>    # 暂停 Agent
 *   meta-agent resume <agent-id>   # 恢复 Agent
 *   meta-agent stop <agent-id>     # 停止 Agent
 *   meta-agent message <agent-id>  # 发送消息
 *   meta-agent task <agent-id>     # 派发任务
 *   meta-agent report              # 查看报告
 *   meta-agent meta                # Meta-Agent 控制
 */

import * as fs from 'fs'
import * as path from 'path'

// 简单的 HTTP 请求函数
async function request(
  method: string,
  endpoint: string,
  body?: any
): Promise<any> {
  const API_BASE = process.env.API_BASE || 'http://localhost:5173'
  const url = `${API_BASE}${endpoint}`
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }
  
  try {
    const response = await fetch(url, options)
    return await response.json()
  } catch (error: any) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

// 打印表格
function printTable(headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) => 
    Math.max(h.length, ...rows.map(r => r[i]?.length || 0))
  )
  
  // 打印表头
  console.log(headers.map((h, i) => h.padEnd(widths[i])).join(' | '))
  console.log(widths.map(w => '-'.repeat(w)).join('-+-'))
  
  // 打印行
  for (const row of rows) {
    console.log(row.map((cell, i) => (cell || '').padEnd(widths[i])).join(' | '))
  }
}

// 命令处理
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  switch (command) {
    case 'status':
    case 's': {
      // 获取所有 Agent 状态
      console.log('📊 Fetching agent status...\n')
      
      const [runtimesRes, metaRes, tasksRes] = await Promise.all([
        request('GET', '/api/agent-runtime'),
        request('GET', '/api/meta/status'),
        request('GET', '/api/agent/tasks'),
      ])
      
      if (runtimesRes.success) {
        console.log('Agent Runtimes:')
        printTable(
          ['ID', 'Agent', 'Status', 'Mode', 'Uptime'],
          runtimesRes.data.map((r: any) => [
            r.id.slice(0, 8),
            r.agentId.slice(0, 8),
            r.status,
            r.config.mode,
            `${Math.floor(r.stats.totalUptime / 1000 / 60)}m`,
          ])
        )
        console.log()
      }
      
      if (metaRes.success) {
        console.log('Meta-Agent:')
        console.log(`  Status: ${metaRes.data.status}`)
        console.log(`  Workers: ${metaRes.data.workers.total} total, ${metaRes.data.workers.healthy} healthy`)
        console.log(`  Tasks: ${metaRes.data.tasks.currentlyRunning} running, ${metaRes.data.tasks.queued} queued`)
        console.log()
      }
      
      if (tasksRes.success) {
        console.log('Task Stats:')
        console.log(`  Total: ${tasksRes.stats.total}`)
        console.log(`  Pending: ${tasksRes.stats.pending}`)
        console.log(`  Running: ${tasksRes.stats.running}`)
        console.log(`  Completed: ${tasksRes.stats.completed}`)
        console.log(`  Failed: ${tasksRes.stats.failed}`)
      }
      break
    }
    
    case 'start': {
      const agentId = args[1]
      if (!agentId) {
        console.error('Usage: meta-agent start <runtime-id>')
        process.exit(1)
      }
      
      console.log(`🚀 Starting runtime ${agentId}...`)
      const result = await request('POST', `/api/agent-runtime/${agentId}/start`)
      
      if (result.success) {
        console.log(`✅ Runtime started: ${result.data.status}`)
      } else {
        console.error(`❌ Failed: ${result.message}`)
      }
      break
    }
    
    case 'pause': {
      const agentId = args[1]
      if (!agentId) {
        console.error('Usage: meta-agent pause <runtime-id>')
        process.exit(1)
      }
      
      console.log(`⏸️  Pausing runtime ${agentId}...`)
      const result = await request('POST', `/api/agent-runtime/${agentId}/pause`)
      
      if (result.success) {
        console.log(`✅ Runtime paused`)
      } else {
        console.error(`❌ Failed: ${result.message}`)
      }
      break
    }
    
    case 'resume': {
      const agentId = args[1]
      if (!agentId) {
        console.error('Usage: meta-agent resume <runtime-id>')
        process.exit(1)
      }
      
      console.log(`▶️  Resuming runtime ${agentId}...`)
      const result = await request('POST', `/api/agent-runtime/${agentId}/resume`)
      
      if (result.success) {
        console.log(`✅ Runtime resumed`)
      } else {
        console.error(`❌ Failed: ${result.message}`)
      }
      break
    }
    
    case 'stop': {
      const agentId = args[1]
      if (!agentId) {
        console.error('Usage: meta-agent stop <runtime-id>')
        process.exit(1)
      }
      
      const force = args.includes('--force') || args.includes('-f')
      console.log(`🛑 Stopping runtime ${agentId}${force ? ' (force)' : ''}...`)
      const result = await request('POST', `/api/agent-runtime/${agentId}/stop${force ? '?force=true' : ''}`)
      
      if (result.success) {
        console.log(`✅ Runtime stopped`)
      } else {
        console.error(`❌ Failed: ${result.message}`)
      }
      break
    }
    
    case 'message':
    case 'msg': {
      const agentId = args[1]
      const content = args.slice(2).join(' ')
      
      if (!agentId || !content) {
        console.error('Usage: meta-agent message <runtime-id> <content>')
        process.exit(1)
      }
      
      console.log(`💬 Sending message to ${agentId}...`)
      const result = await request('POST', `/api/agent-runtime/${agentId}/message`, {
        type: 'command',
        from: 'cli',
        content,
        priority: 'normal',
      })
      
      if (result.success) {
        console.log(`✅ Message sent: ${result.data.id}`)
      } else {
        console.error(`❌ Failed: ${result.message}`)
      }
      break
    }
    
    case 'task': {
      const agentId = args[1]
      const type = args.find(a => a.startsWith('--type='))?.split('=')[1] || 'custom'
      const paramsIndex = args.findIndex(a => a === '--params')
      const params = paramsIndex !== -1 ? JSON.parse(args[paramsIndex + 1]) : {}
      
      if (!agentId) {
        console.error('Usage: meta-agent task <runtime-id> --type=<type> --params=<json>')
        process.exit(1)
      }
      
      console.log(`📋 Creating task for ${agentId}...`)
      
      // 首先创建任务
      const taskResult = await request('POST', '/api/agent/tasks/trigger', {
        name: `CLI Task - ${type}`,
        type,
        params,
      })
      
      if (taskResult.success) {
        console.log(`✅ Task created: ${taskResult.data.id}`)
      } else {
        console.error(`❌ Failed: ${taskResult.message}`)
      }
      break
    }
    
    case 'report':
    case 'r': {
      console.log('📈 Generating report...\n')
      const result = await request('GET', '/api/report/overview')
      
      if (result.success) {
        const report = result.data
        console.log('System Overview:')
        console.log(`  Total Agents: ${report.overview.totalAgents}`)
        console.log(`  Active Agents: ${report.overview.activeAgents}`)
        console.log(`  Total Tasks: ${report.overview.totalTasks}`)
        console.log(`  Completed Tasks: ${report.overview.completedTasks}`)
        console.log(`  Failed Tasks: ${report.overview.failedTasks}`)
        console.log(`  System Uptime: ${Math.floor(report.overview.systemUptime / 1000 / 60)}m`)
        console.log()
        
        if (report.agents.length > 0) {
          console.log('Agents:')
          printTable(
            ['ID', 'Status', 'Health', 'Tasks Completed'],
            report.agents.map((a: any) => [
              a.agentId.slice(0, 8),
              a.status,
              a.health,
              String(a.stats.tasksCompleted),
            ])
          )
        }
      } else {
        console.error(`❌ Failed: ${result.message}`)
      }
      break
    }
    
    case 'meta': {
      const subCommand = args[1]
      
      switch (subCommand) {
        case 'start': {
          console.log('🚀 Starting Meta-Agent...')
          const result = await request('POST', '/api/meta/start')
          console.log(result.success ? '✅ Meta-Agent started' : `❌ Failed: ${result.message}`)
          break
        }
        
        case 'stop': {
          console.log('🛑 Stopping Meta-Agent...')
          const result = await request('POST', '/api/meta/stop')
          console.log(result.success ? '✅ Meta-Agent stopped' : `❌ Failed: ${result.message}`)
          break
        }
        
        case 'status': {
          const result = await request('GET', '/api/meta/status')
          if (result.success) {
            console.log('Meta-Agent Status:')
            console.log(`  Status: ${result.data.status}`)
            console.log(`  Workers: ${result.data.workers.total} total`)
            console.log(`    - Healthy: ${result.data.workers.healthy}`)
            console.log(`    - Degraded: ${result.data.workers.degraded}`)
            console.log(`    - Unhealthy: ${result.data.workers.unhealthy}`)
            console.log(`  Tasks: ${result.data.tasks.currentlyRunning} running`)
          }
          break
        }
        
        case 'workers': {
          const result = await request('GET', '/api/meta/workers')
          if (result.success) {
            console.log('Registered Workers:')
            printTable(
              ['ID', 'Name', 'Capabilities', 'Status'],
              result.data.workers.map((w: any) => [
                w.agentId.slice(0, 8),
                w.name,
                w.capabilities.join(', '),
                w.status,
              ])
            )
          }
          break
        }
        
        default: {
          console.log('Meta-Agent Commands:')
          console.log('  meta-agent meta start      # Start Meta-Agent')
          console.log('  meta-agent meta stop       # Stop Meta-Agent')
          console.log('  meta-agent meta status     # Get Meta-Agent status')
          console.log('  meta-agent meta workers    # List registered workers')
        }
      }
      break
    }
    
    case 'help':
    case '-h':
    case '--help':
    default: {
      console.log(`
Meta-Agent CLI - Control your agents from the command line

Usage: meta-agent <command> [options]

Commands:
  status, s              Show all agent status
  start <id>             Start an agent runtime
  pause <id>             Pause an agent runtime
  resume <id>            Resume an agent runtime
  stop <id>              Stop an agent runtime (use --force to force stop)
  message, msg <id>      Send a message to an agent
  task <id>              Create a task for an agent
    --type=<type>        Task type (default: custom)
    --params=<json>      Task parameters as JSON
  report, r              Generate system report
  meta                   Meta-Agent control
    start                Start Meta-Agent
    stop                 Stop Meta-Agent
    status               Get Meta-Agent status
    workers              List registered workers
  help                   Show this help message

Examples:
  meta-agent status
  meta-agent start runtime_abc123
  meta-agent message runtime_abc123 "Hello Agent!"
  meta-agent task runtime_abc123 --type=content_fetch --params='{"url":"https://example.com"}'
  meta-agent report
  meta-agent meta start
`)
    }
  }
}

main().catch(console.error)
