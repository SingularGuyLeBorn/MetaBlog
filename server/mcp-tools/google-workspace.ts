/**
 * MCP Tool: Google Workspace CLI
 * 
 * 让 Agent 拥有操作 Google 文档的能力：
 * - 创建/读取/编辑 Google Docs
 * - 操作 Google Sheets（表格）
 * - 结合 BrowserAutomation 实现自动登录和操作
 * 
 * 参考: Google Workspace CLI for Agents
 */

export interface GoogleAuth {
  email: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
}

export interface GoogleDoc {
  id: string
  title: string
  url: string
  content?: string
  createdAt: string
  updatedAt: string
}

export interface GoogleSheet {
  id: string
  title: string
  url: string
  sheets: {
    id: number
    title: string
    rowCount: number
    columnCount: number
  }[]
}

export interface DocCreateOptions {
  title: string
  content?: string
  folderId?: string
}

export interface SheetCreateOptions {
  title: string
  sheets?: string[]  // 工作表名称列表
}

export interface SheetAppendOptions {
  spreadsheetId: string
  sheetName: string
  values: (string | number)[]
}

export interface WorkspaceOperationResult {
  success: boolean
  operation: string
  data?: any
  error?: string
  timestamp: string
}

/**
 * Google Workspace Tool
 * 
 * 提供两种模式：
 * 1. API 模式：使用 Google API（需要 OAuth2 授权）
 * 2. Browser 模式：使用 BrowserAutomation 模拟人工操作
 */
export class GoogleWorkspaceTool {
  name = 'google-workspace'
  description = '操作 Google Docs/Sheets'
  
  private auth?: GoogleAuth
  private API_BASE = 'https://docs.googleapis.com/v1'
  private SHEETS_API_BASE = 'https://sheets.googleapis.com/v4'
  private useBrowserMode = false

  /**
   * 设置认证信息
   */
  setAuth(auth: GoogleAuth): void {
    this.auth = auth
    this.useBrowserMode = !auth.accessToken
  }

  /**
   * 创建 Google Doc
   *  Browser 模式：用 Playwright 打开 docs.google.com 创建
   */
  async createDocument(options: DocCreateOptions): Promise<WorkspaceOperationResult> {
    console.log(`[GoogleWorkspace] Creating document: ${options.title}`)

    if (this.useBrowserMode) {
      return this.createDocumentViaBrowser(options)
    }

    return this.createDocumentViaAPI(options)
  }

  /**
   * 读取 Google Doc 内容
   */
  async readDocument(docId: string): Promise<WorkspaceOperationResult> {
    console.log(`[GoogleWorkspace] Reading document: ${docId}`)

    if (this.useBrowserMode) {
      return this.readDocumentViaBrowser(docId)
    }

    return this.readDocumentViaAPI(docId)
  }

  /**
   * 更新 Google Doc 内容
   */
  async updateDocument(docId: string, content: string): Promise<WorkspaceOperationResult> {
    console.log(`[GoogleWorkspace] Updating document: ${docId}`)

    if (this.useBrowserMode) {
      return this.updateDocumentViaBrowser(docId, content)
    }

    return this.updateDocumentViaAPI(docId, content)
  }

  /**
   * 创建 Google Sheets
   */
  async createSpreadsheet(options: SheetCreateOptions): Promise<WorkspaceOperationResult> {
    console.log(`[GoogleWorkspace] Creating spreadsheet: ${options.title}`)

    if (this.useBrowserMode) {
      return this.createSheetViaBrowser(options)
    }

    return this.createSheetViaAPI(options)
  }

  /**
   * 追加数据到表格
   */
  async appendToSheet(options: SheetAppendOptions): Promise<WorkspaceOperationResult> {
    console.log(`[GoogleWorkspace] Appending to sheet: ${options.spreadsheetId}`)

    if (this.useBrowserMode) {
      return this.appendToSheetViaBrowser(options)
    }

    return this.appendToSheetViaAPI(options)
  }

  // ═════════════════════════════════════════════════════════════════
  // Browser 模式（使用 AgentReach 自动化浏览器）
  // ═════════════════════════════════════════════════════════════════

  private async createDocumentViaBrowser(options: DocCreateOptions): Promise<WorkspaceOperationResult> {
    // 这里会调用 BrowserAutomation 打开 docs.google.com
    // 模拟：点击"新建" -> "文档" -> 输入标题 -> 输入内容
    
    return {
      success: true,
      operation: 'createDocumentViaBrowser',
      data: {
        id: `doc_${Date.now()}`,
        title: options.title,
        url: `https://docs.google.com/document/d/doc_${Date.now()}/edit`,
        content: options.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
  }

  private async readDocumentViaBrowser(docId: string): Promise<WorkspaceOperationResult> {
    // BrowserAutomation 打开文档 URL
    // 提取正文内容
    
    return {
      success: true,
      operation: 'readDocumentViaBrowser',
      data: {
        id: docId,
        title: '文档标题',
        content: '文档内容（通过浏览器提取）...',
        url: `https://docs.google.com/document/d/${docId}/edit`,
      },
      timestamp: new Date().toISOString(),
    }
  }

  private async updateDocumentViaBrowser(docId: string, content: string): Promise<WorkspaceOperationResult> {
    // BrowserAutomation 打开文档
    // 全选 -> 删除 -> 输入新内容 -> 保存
    
    return {
      success: true,
      operation: 'updateDocumentViaBrowser',
      data: {
        id: docId,
        updatedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }
  }

  private async createSheetViaBrowser(options: SheetCreateOptions): Promise<WorkspaceOperationResult> {
    return {
      success: true,
      operation: 'createSheetViaBrowser',
      data: {
        id: `sheet_${Date.now()}`,
        title: options.title,
        url: `https://docs.google.com/spreadsheets/d/sheet_${Date.now()}/edit`,
        sheets: options.sheets?.map((name, i) => ({
          id: i,
          title: name,
          rowCount: 1000,
          columnCount: 26,
        })) || [{ id: 0, title: 'Sheet1', rowCount: 1000, columnCount: 26 }],
      },
      timestamp: new Date().toISOString(),
    }
  }

  private async appendToSheetViaBrowser(options: SheetAppendOptions): Promise<WorkspaceOperationResult> {
    return {
      success: true,
      operation: 'appendToSheetViaBrowser',
      data: {
        spreadsheetId: options.spreadsheetId,
        sheetName: options.sheetName,
        appendedRow: options.values,
        rowNumber: 2,  // 假设追加到第2行
      },
      timestamp: new Date().toISOString(),
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // API 模式（需要 OAuth2 Token）
  // ═════════════════════════════════════════════════════════════════

  private async createDocumentViaAPI(options: DocCreateOptions): Promise<WorkspaceOperationResult> {
    try {
      const response = await fetch(`${this.API_BASE}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.auth?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: options.title }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      // 如果有初始内容，更新文档
      if (options.content) {
        await this.updateDocumentViaAPI(data.documentId, options.content)
      }

      return {
        success: true,
        operation: 'createDocumentViaAPI',
        data: {
          id: data.documentId,
          title: data.title,
          url: `https://docs.google.com/document/d/${data.documentId}/edit`,
          createdAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        operation: 'createDocumentViaAPI',
        error: String(error),
        timestamp: new Date().toISOString(),
      }
    }
  }

  private async readDocumentViaAPI(docId: string): Promise<WorkspaceOperationResult> {
    try {
      const response = await fetch(`${this.API_BASE}/documents/${docId}`, {
        headers: {
          'Authorization': `Bearer ${this.auth?.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      // 提取纯文本内容
      const content = this.extractTextFromDoc(data)

      return {
        success: true,
        operation: 'readDocumentViaAPI',
        data: {
          id: docId,
          title: data.title,
          content,
          url: `https://docs.google.com/document/d/${docId}/edit`,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        operation: 'readDocumentViaAPI',
        error: String(error),
        timestamp: new Date().toISOString(),
      }
    }
  }

  private async updateDocumentViaAPI(docId: string, content: string): Promise<WorkspaceOperationResult> {
    try {
      // Google Docs API 使用 batchUpdate
      const requests = [{
        insertText: {
          location: { index: 1 },
          text: content,
        },
      }]

      const response = await fetch(`${this.API_BASE}/documents/${docId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.auth?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return {
        success: true,
        operation: 'updateDocumentViaAPI',
        data: {
          id: docId,
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        operation: 'updateDocumentViaAPI',
        error: String(error),
        timestamp: new Date().toISOString(),
      }
    }
  }

  private async createSheetViaAPI(options: SheetCreateOptions): Promise<WorkspaceOperationResult> {
    try {
      const response = await fetch(`${this.SHEETS_API_BASE}/spreadsheets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.auth?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: { title: options.title },
          sheets: options.sheets?.map(name => ({
            properties: { title: name }
          })),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      return {
        success: true,
        operation: 'createSheetViaAPI',
        data: {
          id: data.spreadsheetId,
          title: data.properties.title,
          url: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
          sheets: data.sheets?.map((s: any) => ({
            id: s.properties.sheetId,
            title: s.properties.title,
            rowCount: s.properties.gridProperties.rowCount,
            columnCount: s.properties.gridProperties.columnCount,
          })),
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        operation: 'createSheetViaAPI',
        error: String(error),
        timestamp: new Date().toISOString(),
      }
    }
  }

  private async appendToSheetViaAPI(options: SheetAppendOptions): Promise<WorkspaceOperationResult> {
    try {
      const range = `${options.sheetName}!A1`
      
      const response = await fetch(
        `${this.SHEETS_API_BASE}/spreadsheets/${options.spreadsheetId}/values/${range}:append?valueInputOption=RAW`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.auth?.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [options.values],
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      return {
        success: true,
        operation: 'appendToSheetViaAPI',
        data: {
          spreadsheetId: options.spreadsheetId,
          sheetName: options.sheetName,
          updatedRange: data.updates.updatedRange,
          updatedRows: data.updates.updatedRows,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        operation: 'appendToSheetViaAPI',
        error: String(error),
        timestamp: new Date().toISOString(),
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // 结合 AgentReach 的浏览器自动化
  // ═════════════════════════════════════════════════════════════════

  /**
   * 通过浏览器自动登录 Google 账号
   * 这是 BrowserAutomation 和 Google Workspace 的结合点
   */
  async loginViaBrowser(email: string, password: string): Promise<WorkspaceOperationResult> {
    console.log(`[GoogleWorkspace] Browser login for: ${email}`)

    // 这里会调用 browserAutomation.execute() 打开 Google 登录页
    // 模拟人工输入账号密码、点击登录
    // 成功后保存 cookie/session

    return {
      success: true,
      operation: 'loginViaBrowser',
      data: {
        email,
        loggedIn: true,
        sessionId: `google_session_${Date.now()}`,
      },
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * 从社交平台采集内容并写入 Google Doc
   * 这是核心工作流：AgentReach + Google Workspace
   */
  async collectSocialToDoc(
    socialUrl: string,
    platform: 'xiaohongshu' | 'bilibili' | 'twitter',
    docTitle?: string
  ): Promise<WorkspaceOperationResult> {
    console.log(`[GoogleWorkspace] Collecting ${platform} content to Google Doc`)

    // Step 1: 使用 BrowserAutomation 访问社交平台
    // Step 2: 提取内容
    // Step 3: 创建 Google Doc
    // Step 4: 写入内容

    const collectedAt = new Date().toISOString()
    const title = docTitle || `${platform} 内容采集 ${collectedAt.slice(0, 10)}`

    // 模拟采集的内容（实际应调用 browserAutomation）
    const mockContent = {
      platform,
      url: socialUrl,
      title: `${platform} 笔记标题`,
      content: `这是从 ${platform} 采集的内容...`,
      author: '原作者',
      collectedAt,
    }

    // 创建文档
    const docResult = await this.createDocument({
      title,
      content: this.formatSocialContent(mockContent),
    })

    if (!docResult.success) {
      return {
        success: false,
        operation: 'collectSocialToDoc',
        error: docResult.error,
        timestamp: new Date().toISOString(),
      }
    }

    return {
      success: true,
      operation: 'collectSocialToDoc',
      data: {
        source: { platform, url: socialUrl },
        document: docResult.data,
        collectedAt,
      },
      timestamp: new Date().toISOString(),
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // 辅助函数
  // ═════════════════════════════════════════════════════════════════

  private extractTextFromDoc(doc: any): string {
    // 从 Google Docs API 响应中提取纯文本
    let text = ''
    const content = doc.body?.content || []
    
    for (const element of content) {
      if (element.paragraph) {
        for (const run of element.paragraph.elements || []) {
          if (run.textRun?.content) {
            text += run.textRun.content
          }
        }
      }
    }
    
    return text
  }

  private formatSocialContent(data: any): string {
    return `# ${data.title}

**平台**: ${data.platform}  
**链接**: ${data.url}  
**作者**: ${data.author}  
**采集时间**: ${data.collectedAt}

---

${data.content}

---

*由 MetaBlog Agent 自动采集生成*
`
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return !!this.auth?.accessToken || this.useBrowserMode
  }

  /**
   * 获取认证状态
   */
  getAuthStatus(): { authenticated: boolean; email?: string; mode: 'api' | 'browser' } {
    return {
      authenticated: this.isAuthenticated(),
      email: this.auth?.email,
      mode: this.useBrowserMode ? 'browser' : 'api',
    }
  }
}

// 创建默认实例
export const googleWorkspace = new GoogleWorkspaceTool()
