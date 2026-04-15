import type { ViteDevServer } from "vite";
import path from "path";
import fs from "fs";

export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

export function registerSkillsRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;
  // ============================================
  // Skills API - 技能管理
  // ============================================

  const SKILLS_FILE = path.join(process.cwd(), ".data", "skills.json");

  // 确保数据目录存在
  if (!fs.existsSync(path.dirname(SKILLS_FILE))) {
    fs.mkdirSync(path.dirname(SKILLS_FILE), { recursive: true });
  }

  // Skills 目录路径
  const SKILLS_DIR = path.join(process.cwd(), ".skills");

  // 确保 Skills 目录存在
  function ensureSkillsDir() {
    if (!fs.existsSync(SKILLS_DIR)) {
      fs.mkdirSync(SKILLS_DIR, { recursive: true });
    }
  }

  // 解析 SKILL.md 文件
  function parseSkillMd(
    content: string,
    skillId: string,
    dirName: string,
  ): any {
    const lines = content.split("\n");
    const skill: any = {
      id: skillId,
      name: dirName.replace(/-/g, " "),
      icon: "🔧",
      description: "",
      content: "",
      systemPrompt: "",
      category: "custom",
      version: "1.0.0",
      isBuiltIn: false,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      tools: [],
      usageScenarios: [],
      author: "user",
    };

    let section = "";
    let promptLines: string[] = [];
    let inPrompt = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 解析标题
      if (line.startsWith("# ") && !line.startsWith("## ")) {
        skill.name = line.substring(2).trim();
        continue;
      }

      // 解析章节
      if (line.startsWith("## ")) {
        section = line.substring(3).trim().toLowerCase();
        inPrompt = false;
        continue;
      }

      // 解析元数据
      if (section === "元数据" || section === "metadata") {
        if (line.startsWith("- **")) {
          const match = line.match(/- \*\*(\w+)\*\*:\s*`?(.+?)`?$/);
          if (match) {
            const [, key, value] = match;
            switch (key.toLowerCase()) {
              case "id":
                skill.id = value;
                break;
              case "图标":
              case "icon":
                skill.icon = value;
                break;
              case "分类":
              case "category":
                skill.category = value;
                break;
              case "版本":
              case "version":
                skill.version = value;
                break;
              case "标签":
              case "tags":
                skill.tags = value.split(",").map((t) => t.trim());
                break;
              case "作者":
              case "author":
                skill.author = value;
                break;
              case "内置":
              case "built-in":
                skill.isBuiltIn = value === "true";
                break;
              case "启用":
              case "enabled":
                skill.enabled = value !== "false";
                break;
            }
          }
        }
      }

      // 解析描述
      if (section === "描述" || section === "description") {
        if (line.trim() && !line.startsWith("-")) {
          skill.description = line.trim();
        }
      }

      // 解析使用场景
      if (
        section === "使用场景" ||
        section === "usage scenarios" ||
        section === "usagescenarios"
      ) {
        if (line.startsWith("- ")) {
          skill.usageScenarios.push(line.substring(2).trim());
        }
      }

      // 解析可用工具
      if (section === "可用工具" || section === "tools") {
        if (line.startsWith("- ")) {
          skill.tools.push(line.substring(2).trim());
        }
      }

      // 解析 Prompt
      if (section === "prompt" || (line.startsWith("---") && section)) {
        if (line.startsWith("---")) {
          inPrompt = true;
          continue;
        }
        if (inPrompt || section === "prompt") {
          promptLines.push(line);
        }
      }
    }

    skill.content = promptLines.join("\n").trim();
    skill.systemPrompt = skill.content;
    return skill;
  }

  // 生成 SKILL.md 内容
  function generateSkillMd(skill: any): string {
    const usageScenarios = skill.usageScenarios || [];
    return `# ${skill.name}

## 描述
${skill.description || ""}

## 元数据
- **ID**: \`${skill.id}\`
- **图标**: ${skill.icon || "🔧"}
- **分类**: ${skill.category || "custom"}
- **版本**: ${skill.version || "1.0.0"}
- **标签**: ${(skill.tags || []).join(", ")}
- **作者**: ${skill.author || ""}
- **内置**: ${skill.isBuiltIn || false}
- **启用**: ${skill.enabled ?? true}

## 使用场景
${usageScenarios.map((s: string) => `- ${s}`).join("\n") || "- 暂无使用场景"}

## 可用工具
${(skill.tools || []).map((t: string) => `- ${t}`).join("\n") || "- 暂无工具"}

---

## Prompt

${skill.content || skill.systemPrompt || ""}
`;
  }

  // 读取所有 Skills (从 SKILL.md 文件)
  function readSkills(): any[] {
    ensureSkillsDir();
    const skills: any[] = [];

    try {
      const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const skillFile = path.join(SKILLS_DIR, dir.name, "SKILL.md");
          if (fs.existsSync(skillFile)) {
            const content = fs.readFileSync(skillFile, "utf-8");
            const stat = fs.statSync(skillFile);
            const skill = parseSkillMd(content, dir.name, dir.name);
            skill.createdAt = stat.birthtimeMs;
            skill.updatedAt = stat.mtimeMs;
            skills.push(skill);
          }
        }
      }
    } catch (e) {
      console.error("[API] Failed to read skills:", e);
    }

    return skills.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  // 写入 Skill (创建/更新 SKILL.md 文件)
  function writeSkill(skill: any): void {
    ensureSkillsDir();
    const dirName =
      skill.id || skill.name.toLowerCase().replace(/\s+/g, "-");
    const skillDir = path.join(SKILLS_DIR, dirName);

    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    const skillFile = path.join(skillDir, "SKILL.md");
    const content = generateSkillMd(skill);
    fs.writeFileSync(skillFile, content, "utf-8");
  }

  // 删除 Skill (删除目录)
  function deleteSkillDir(skillId: string): boolean {
    const skillDir = path.join(SKILLS_DIR, skillId);
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
      return true;
    }
    return false;
  }

  // GET /api/skills - 获取所有 Skills
  server.middlewares.use("/api/skills", (req, res, next) => {
    const url = req.url || "";
    if (url !== "/" && url !== "" && !url.startsWith("?")) {
      return next();
    }

    if (req.method === "GET") {
      const skills = readSkills();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, data: skills }));
    } else if (req.method === "POST") {
      // POST /api/skills - 创建 Skill
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());

          const newSkill = {
            id:
              body.id ||
              `skill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            ...body,
            // 字段映射：支持 content 和 systemPrompt 两种字段名
            systemPrompt: body.content || body.systemPrompt || "",
            usageScenarios: body.usageScenarios || [],
            isBuiltIn: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          writeSkill(newSkill);

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, data: newSkill }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      });
    } else next();
  });

  // GET /api/skills/:id - 获取单个 Skill
  server.middlewares.use("/api/skills/", (req, res, next) => {
    const url = req.url || "";
    const parts = url.split("/").filter(Boolean);
    // 只处理单个 ID 的情况，排除 update/delete 等子路径
    if (
      parts.length !== 1 ||
      ["update", "delete"].includes(parts[0]) ||
      req.method !== "GET"
    ) {
      return next();
    }

    const id = parts[0].split("?")[0];
    try {
      const skills = readSkills();
      const skill = skills.find((s: any) => s.id === id);

      if (!skill) {
        res.statusCode = 404;
        res.end(
          JSON.stringify({ success: false, error: "Skill not found" }),
        );
        return;
      }

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, data: skill }));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: String(e) }));
    }
  });

  // POST /api/skills/update - 更新 Skill
  server.middlewares.use("/api/skills/update", (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { id, ...updates } = body;

          const skills = readSkills();
          const index = skills.findIndex((s: any) => s.id === id);

          if (index === -1) {
            res.statusCode = 404;
            res.end(
              JSON.stringify({
                success: false,
                error: "Skill not found",
              }),
            );
            return;
          }

          // 不允许修改内置技能标记和ID
          delete updates.isBuiltIn;
          delete updates.id;

          // 字段映射
          if (updates.content !== undefined) {
            updates.systemPrompt = updates.content;
          }
          if (updates.usageScenarios === undefined) {
            updates.usageScenarios = skills[index].usageScenarios || [];
          }

          const updatedSkill = {
            ...skills[index],
            ...updates,
            updatedAt: Date.now(),
          };
          writeSkill(updatedSkill);

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ success: true, data: updatedSkill }),
          );
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      });
    } else next();
  });

  // POST /api/skills/delete - 删除 Skill
  server.middlewares.use("/api/skills/delete", (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { id } = body;

          const skills = readSkills();
          const skill = skills.find((s: any) => s.id === id);

          if (skill && skill.isBuiltIn) {
            res.statusCode = 403;
            res.end(
              JSON.stringify({
                success: false,
                error: "Cannot delete built-in skill",
              }),
            );
            return;
          }

          deleteSkillDir(id);

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      });
    } else next();
  });

}
