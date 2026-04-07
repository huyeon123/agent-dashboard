import fs from 'fs';
import path from 'path';
import type {
  AgentConfig,
  AgentPaths,
  InstructionsData,
  SkillInfo,
  AgentSupports,
  InstructionFileStatus,
  RulesCountResult,
  RuleFileInfo,
  RulesListResult,
} from './types';
import { resolveHome, getSupports } from './types';
import { parseMarkdownSections, parseYamlFrontmatter } from '../parsers';
import { safeReadFile, ensureDir, backupFile } from '../backup';

export class AgentAdapter {
  readonly config: AgentConfig;
  constructor(config: AgentConfig) { this.config = config; }

  get paths(): AgentPaths {
    return this.config.paths;
  }

  get supports(): AgentSupports {
    return getSupports(this.paths);
  }

  get globalHome(): string {
    return resolveHome(this.paths.globalHome);
  }

  // --- Instructions ---
  getGlobalInstructions(): InstructionsData {
    const filePath = resolveHome(this.paths.globalInstruction);
    const raw = safeReadFile(filePath);
    return {
      raw,
      sections: parseMarkdownSections(raw),
      filePath,
    };
  }

  setGlobalInstructions(raw: string): void {
    const filePath = resolveHome(this.paths.globalInstruction);
    ensureDir(path.dirname(filePath));
    backupFile(filePath);
    fs.writeFileSync(filePath, raw, 'utf-8');
  }

  getProjectInstructions(projectPath: string): InstructionsData {
    const filePath = path.join(projectPath, this.paths.projectInstruction);
    const raw = safeReadFile(filePath);
    return {
      raw,
      sections: parseMarkdownSections(raw),
      filePath,
    };
  }

  setProjectInstructions(projectPath: string, raw: string): void {
    const filePath = path.join(projectPath, this.paths.projectInstruction);
    ensureDir(path.dirname(filePath));
    backupFile(filePath);
    fs.writeFileSync(filePath, raw, 'utf-8');
  }

  deleteProjectInstructions(projectPath: string): boolean {
    const filePath = path.join(projectPath, this.paths.projectInstruction);
    if (fs.existsSync(filePath)) {
      backupFile(filePath);
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  // --- Instruction file existence checks ---
  checkGlobalInstructionFiles(): { files: InstructionFileStatus[] } {
    const files = this.paths.instructionFiles?.global ?? [];
    return {
      files: files.map((filePath) => {
        const resolved = resolveHome(filePath);
        return {
          name: path.basename(resolved),
          path: resolved,
          exists: fs.existsSync(resolved),
        };
      }),
    };
  }

  checkProjectInstructionFiles(projectPath: string): { files: InstructionFileStatus[] } {
    const files = this.paths.instructionFiles?.project ?? [];
    return {
      files: files.map((filePath) => {
        const resolved = path.join(projectPath, filePath);
        return {
          name: filePath,
          path: resolved,
          exists: fs.existsSync(resolved),
        };
      }),
    };
  }

  // --- Rules directory count ---
  getGlobalRulesCount(): RulesCountResult {
    const dir = this.paths.rulesDir?.global;
    if (!dir) return { count: 0, dir: '' };
    const resolved = resolveHome(dir);
    return { count: this.countMdFiles(resolved), dir: resolved };
  }

  getProjectRulesCount(projectPath: string): RulesCountResult {
    const dir = this.paths.rulesDir?.project;
    if (!dir) return { count: 0, dir: '' };
    const resolved = path.join(projectPath, dir);
    return { count: this.countMdFiles(resolved), dir: resolved };
  }

  getGlobalRules(): RulesListResult {
    const dir = this.paths.rulesDir?.global;
    if (!dir) return { files: [], dir: '', unsupported: true };
    const resolved = resolveHome(dir);
    return { files: this.readMdFiles(resolved), dir: resolved };
  }

  getProjectRules(projectPath: string): RulesListResult {
    const dir = this.paths.rulesDir?.project;
    if (!dir) return { files: [], dir: '', unsupported: true };
    const resolved = path.join(projectPath, dir);
    return { files: this.readMdFiles(resolved), dir: resolved };
  }

  private countMdFiles(dir: string): number {
    if (!fs.existsSync(dir)) return 0;
    try {
      return fs.readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith('.md'))
        .length;
    } catch {
      return 0;
    }
  }

  private readMdFiles(dir: string): RuleFileInfo[] {
    if (!fs.existsSync(dir)) return [];

    try {
      return fs.readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => {
          const filePath = path.join(dir, entry.name);
          return {
            name: entry.name,
            path: filePath,
            raw: safeReadFile(filePath),
          };
        });
    } catch {
      return [];
    }
  }

  // --- Settings ---
  getSettings(): { raw: string; parsed: Record<string, unknown>; format: string; filePath: string } | null {
    if (!this.paths.settings) return null;
    const filePath = path.join(this.globalHome, this.paths.settings);
    const raw = safeReadFile(filePath);
    if (!raw) return { raw: '', parsed: {}, format: this.paths.settingsFormat || 'json', filePath };

    let parsed: Record<string, unknown> = {};
    try {
      if (this.paths.settingsFormat === 'toml') {
        // Basic TOML parsing - just return raw for now, frontend can parse
        parsed = { _raw: raw };
      } else {
        // JSON or JSONC
        const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        parsed = JSON.parse(cleaned);
      }
    } catch {
      parsed = { _parseError: true };
    }

    return { raw, parsed, format: this.paths.settingsFormat || 'json', filePath };
  }

  setSettings(raw: string): void {
    if (!this.paths.settings) return;
    const filePath = path.join(this.globalHome, this.paths.settings);
    ensureDir(path.dirname(filePath));
    backupFile(filePath);
    fs.writeFileSync(filePath, raw, 'utf-8');
  }

  // --- Skills ---
  getSkills(): SkillInfo[] {
    if (!this.paths.skills) return [];
    const skills: SkillInfo[] = [];

    // Global skills
    const globalSkillsDir = path.join(this.globalHome, this.paths.skills);
    if (fs.existsSync(globalSkillsDir)) {
      this.scanSkillsDir(globalSkillsDir, 'user', skills);
    }

    return skills;
  }

  private scanSkillsDir(dir: string, source: 'user' | 'plugin' | 'project', skills: SkillInfo[], projectName?: string): void {
    if (!fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillDir = path.join(dir, entry.name);
        const skillFile = path.join(skillDir, 'SKILL.md');

        if (fs.existsSync(skillFile)) {
          const content = fs.readFileSync(skillFile, 'utf-8');
          const { frontmatter, body } = parseYamlFrontmatter(content);

          skills.push({
            id: `${source}:${entry.name}`,
            name: (frontmatter.name as string) || entry.name,
            description: (frontmatter.description as string) || '',
            path: skillFile,
            source,
            content: body.trim().slice(0, 800),
            projectName,
          });
        }
      }
    } catch {
      // Permission error or similar
    }
  }

  createSkill(name: string, description: string, content: string, scope: 'global' | 'project', projectPath?: string): void {
    if (!this.paths.skills) return;

    const baseDir = scope === 'global'
      ? path.join(this.globalHome, this.paths.skills)
      : path.join(projectPath || '', this.config.paths.projectDir, this.paths.skills);

    const skillDir = path.join(baseDir, name);
    ensureDir(skillDir);

    const skillContent = `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`;
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent, 'utf-8');
  }

  deleteSkill(skillPath: string): boolean {
    if (fs.existsSync(skillPath)) {
      const dir = path.dirname(skillPath);
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    }
    return false;
  }

  // --- Agent Definitions ---
  getAgentDefs(): Array<{ id: string; name: string; description: string; model: string; tools: string[]; path: string; scope: string; raw: string }> {
    if (!this.paths.agents) return [];
    const defs: Array<{ id: string; name: string; description: string; model: string; tools: string[]; path: string; scope: string; raw: string }> = [];

    const globalAgentsDir = path.join(this.globalHome, this.paths.agents);
    if (fs.existsSync(globalAgentsDir)) {
      this.scanAgentsDir(globalAgentsDir, 'global', defs);
    }

    return defs;
  }

  private scanAgentsDir(dir: string, scope: string, defs: Array<{ id: string; name: string; description: string; model: string; tools: string[]; path: string; scope: string; raw: string }>): void {
    if (!fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

        const filePath = path.join(dir, entry.name);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { frontmatter, body } = parseYamlFrontmatter(raw);

        const tools = Array.isArray(frontmatter.tools)
          ? (frontmatter.tools as string[])
          : typeof frontmatter.tools === 'string'
            ? [frontmatter.tools as string]
            : [];

        defs.push({
          id: `${scope}:${entry.name.replace('.md', '')}`,
          name: (frontmatter.name as string) || entry.name.replace('.md', ''),
          description: (frontmatter.description as string) || body.trim().slice(0, 200),
          model: (frontmatter.model as string) || 'unknown',
          tools,
          path: filePath,
          scope,
          raw,
        });
      }
    } catch {
      // Permission error
    }
  }

  // --- Hooks (primarily for Claude) ---
  getHooks(): { hooks: Array<{ event: string; matcher: string; type: string; command: string; timeout?: number; index: number }>; permissions: { allow: string[]; deny: string[] }; disableAllHooks: boolean } | null {
    if (!this.paths.hooks) return null;

    // hooks path is like "settings.json#hooks"
    const [file, key] = this.paths.hooks.split('#');
    const filePath = path.join(this.globalHome, file);
    const raw = safeReadFile(filePath);
    if (!raw) return { hooks: [], permissions: { allow: [], deny: [] }, disableAllHooks: false };

    try {
      const settings = JSON.parse(raw);
      const hooksConfig = key ? settings[key] : settings;
      const flatHooks: Array<{ event: string; matcher: string; type: string; command: string; timeout?: number; index: number }> = [];

      if (hooksConfig && typeof hooksConfig === 'object') {
        for (const [event, matchers] of Object.entries(hooksConfig)) {
          if (!Array.isArray(matchers)) continue;
          for (const matcherObj of matchers) {
            const matcher = (matcherObj as Record<string, unknown>).matcher as string || '*';
            const hooks = (matcherObj as Record<string, unknown>).hooks as Array<Record<string, unknown>> || [];
            for (let i = 0; i < hooks.length; i++) {
              const h = hooks[i];
              flatHooks.push({
                event,
                matcher,
                type: (h.type as string) || 'command',
                command: (h.command as string) || (h.url as string) || (h.prompt as string) || '',
                timeout: h.timeout as number | undefined,
                index: i,
              });
            }
          }
        }
      }

      const permissions = settings.permissions || {};
      return {
        hooks: flatHooks,
        permissions: {
          allow: Array.isArray(permissions.allow) ? permissions.allow : [],
          deny: Array.isArray(permissions.deny) ? permissions.deny : [],
        },
        disableAllHooks: !!settings.disableAllHooks,
      };
    } catch {
      return { hooks: [], permissions: { allow: [], deny: [] }, disableAllHooks: false };
    }
  }

  // --- MCP Servers ---
  getMcpServers(): Array<{ name: string; command: string; args: string[]; env?: Record<string, string>; disabled?: boolean }> {
    if (!this.paths.mcp || this.paths.mcp.length === 0) return [];
    const servers: Array<{ name: string; command: string; args: string[]; env?: Record<string, string>; disabled?: boolean }> = [];

    for (const mcpPath of this.paths.mcp) {
      const [file, key] = mcpPath.split('#');

      // Try global home first
      const filePath = file.startsWith('.')
        ? path.join(this.globalHome, '..', file)  // .mcp.json is at project root level
        : path.join(this.globalHome, file);

      const raw = safeReadFile(filePath);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw.replace(/\/\/.*$/gm, ''));
        const mcpConfig = key ? (parsed as Record<string, unknown>)[key] : parsed;

        if (mcpConfig && typeof mcpConfig === 'object') {
          for (const [name, config] of Object.entries(mcpConfig as Record<string, unknown>)) {
            const c = config as Record<string, unknown>;
            servers.push({
              name,
              command: (c.command as string) || '',
              args: Array.isArray(c.args) ? (c.args as string[]) : [],
              ...(c.env && typeof c.env === 'object' ? { env: c.env as Record<string, string> } : {}),
              ...(c.disabled ? { disabled: true } : {}),
            });
          }
        }
      } catch {
        // parse error
      }
    }

    return servers;
  }

  // --- Project-Level Settings ---
  getProjectSettings(projectPath: string): { raw: string; parsed: Record<string, unknown>; format: string; filePath: string } | null {
    if (!this.paths.settings) return null;
    const projectHome = path.join(projectPath, this.paths.projectDir);
    const filePath = path.join(projectHome, this.paths.settings);
    const raw = safeReadFile(filePath);
    if (!raw) return { raw: '', parsed: {}, format: this.paths.settingsFormat || 'json', filePath };

    let parsed: Record<string, unknown> = {};
    try {
      if (this.paths.settingsFormat === 'toml') {
        parsed = { _raw: raw };
      } else {
        const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        parsed = JSON.parse(cleaned);
      }
    } catch {
      parsed = { _parseError: true };
    }

    return { raw, parsed, format: this.paths.settingsFormat || 'json', filePath };
  }

  // --- Project-Level Skills ---
  getProjectSkills(projectPath: string): SkillInfo[] {
    if (!this.paths.skills) return [];
    const skills: SkillInfo[] = [];
    const projectSkillsDir = path.join(projectPath, this.paths.projectDir, this.paths.skills);
    if (fs.existsSync(projectSkillsDir)) {
      this.scanSkillsDir(projectSkillsDir, 'project', skills);
    }
    return skills;
  }

  // --- Project-Level Hooks ---
  getProjectHooks(projectPath: string): { hooks: Array<{ event: string; matcher: string; type: string; command: string; timeout?: number; index: number }>; permissions: { allow: string[]; deny: string[] }; disableAllHooks: boolean } | null {
    if (!this.paths.hooks) return null;

    const [file, key] = this.paths.hooks.split('#');
    const projectHome = path.join(projectPath, this.paths.projectDir);
    const filePath = path.join(projectHome, file);
    const raw = safeReadFile(filePath);
    if (!raw) return { hooks: [], permissions: { allow: [], deny: [] }, disableAllHooks: false };

    try {
      const settings = JSON.parse(raw);
      const hooksConfig = key ? settings[key] : settings;
      const flatHooks: Array<{ event: string; matcher: string; type: string; command: string; timeout?: number; index: number }> = [];

      if (hooksConfig && typeof hooksConfig === 'object') {
        for (const [event, matchers] of Object.entries(hooksConfig)) {
          if (!Array.isArray(matchers)) continue;
          for (const matcherObj of matchers) {
            const matcher = (matcherObj as Record<string, unknown>).matcher as string || '*';
            const hooks = (matcherObj as Record<string, unknown>).hooks as Array<Record<string, unknown>> || [];
            for (let i = 0; i < hooks.length; i++) {
              const h = hooks[i];
              flatHooks.push({
                event,
                matcher,
                type: (h.type as string) || 'command',
                command: (h.command as string) || (h.url as string) || (h.prompt as string) || '',
                timeout: h.timeout as number | undefined,
                index: i,
              });
            }
          }
        }
      }

      const permissions = settings.permissions || {};
      return {
        hooks: flatHooks,
        permissions: {
          allow: Array.isArray(permissions.allow) ? permissions.allow : [],
          deny: Array.isArray(permissions.deny) ? permissions.deny : [],
        },
        disableAllHooks: !!settings.disableAllHooks,
      };
    } catch {
      return { hooks: [], permissions: { allow: [], deny: [] }, disableAllHooks: false };
    }
  }

  // --- Project-Level MCP Servers ---
  getProjectMcpServers(projectPath: string): Array<{ name: string; command: string; args: string[]; env?: Record<string, string>; disabled?: boolean }> {
    if (!this.paths.mcp || this.paths.mcp.length === 0) return [];
    const servers: Array<{ name: string; command: string; args: string[]; env?: Record<string, string>; disabled?: boolean }> = [];
    const projectHome = path.join(projectPath, this.paths.projectDir);

    for (const mcpPath of this.paths.mcp) {
      const [file, key] = mcpPath.split('#');

      const filePath = file.startsWith('.')
        ? path.join(projectPath, file)
        : path.join(projectHome, file);

      const raw = safeReadFile(filePath);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw.replace(/\/\/.*$/gm, ''));
        const mcpConfig = key ? (parsed as Record<string, unknown>)[key] : parsed;

        if (mcpConfig && typeof mcpConfig === 'object') {
          for (const [name, config] of Object.entries(mcpConfig as Record<string, unknown>)) {
            const c = config as Record<string, unknown>;
            servers.push({
              name,
              command: (c.command as string) || '',
              args: Array.isArray(c.args) ? (c.args as string[]) : [],
              ...(c.env && typeof c.env === 'object' ? { env: c.env as Record<string, string> } : {}),
              ...(c.disabled ? { disabled: true } : {}),
            });
          }
        }
      } catch {
        // parse error
      }
    }

    return servers;
  }

  // --- Project-Level Agent Definitions ---
  getProjectAgentDefs(projectPath: string): Array<{ id: string; name: string; description: string; model: string; tools: string[]; path: string; scope: string; raw: string }> {
    if (!this.paths.agents) return [];
    const defs: Array<{ id: string; name: string; description: string; model: string; tools: string[]; path: string; scope: string; raw: string }> = [];

    const projectAgentsDir = path.join(projectPath, this.paths.projectDir, this.paths.agents);
    if (fs.existsSync(projectAgentsDir)) {
      this.scanAgentsDir(projectAgentsDir, 'project', defs);
    }

    return defs;
  }

  // --- Plugins ---
  getPlugins(): Array<{ name: string; version: string; scope: string; enabled: boolean; path: string }> {
    if (!this.paths.plugins) return [];

    const pluginsDir = path.join(this.globalHome, this.paths.plugins);
    const registryPath = path.join(pluginsDir, 'installed_plugins.json');

    if (!fs.existsSync(registryPath)) return [];

    // Read settings.local.json for enabledPlugins state
    const settingsLocalPath = path.join(this.globalHome, 'settings.local.json');
    let enabledPlugins: Record<string, boolean> = {};
    try {
      const localRaw = safeReadFile(settingsLocalPath);
      if (localRaw) {
        const localData = JSON.parse(localRaw);
        if (localData.enabledPlugins && typeof localData.enabledPlugins === 'object') {
          enabledPlugins = localData.enabledPlugins as Record<string, boolean>;
        }
      }
    } catch { /* ignore */ }

    const mapScope = (s: string): string => {
      if (s === 'user') return 'global';
      if (s === 'local') return 'project';
      return s;
    };

    try {
      const raw = fs.readFileSync(registryPath, 'utf-8');
      const data = JSON.parse(raw);

      // v2 format: { version: 2, plugins: { "name@marketplace": [...] } }
      if (data && data.version === 2 && data.plugins && typeof data.plugins === 'object' && !Array.isArray(data.plugins)) {
        const results: Array<{ name: string; version: string; scope: string; enabled: boolean; path: string }> = [];
        for (const [key, entries] of Object.entries(data.plugins)) {
          const pluginName = key.split('@')[0] || key;
          if (!Array.isArray(entries)) continue;
          for (const entry of entries) {
            const e = entry as Record<string, unknown>;
            results.push({
              name: pluginName,
              version: (e.version as string) || '0.0.0',
              scope: mapScope((e.scope as string) || 'user'),
              enabled: enabledPlugins[key] !== false,
              path: (e.installPath as string) || pluginsDir,
            });
          }
        }
        return results;
      }

      // v1 format: plain array
      if (Array.isArray(data)) {
        return data.map((p: Record<string, unknown>) => ({
          name: (p.name as string) || 'unknown',
          version: (p.version as string) || '0.0.0',
          scope: (p.scope as string) || 'user',
          enabled: p.enabled !== false,
          path: (p.path as string) || pluginsDir,
        }));
      }
    } catch {
      // parse error
    }

    return [];
  }

  getProjectPlugins(projectPath: string): Array<{ name: string; version: string; scope: string; enabled: boolean; path: string }> {
    return this.getPlugins().filter((p) => p.scope === 'project' && p.path.startsWith(projectPath));
  }

  // --- Phase 0: Private helpers for settings JSON ---
  private readSettingsJson(scope: 'global' | 'project', projectPath?: string): { parsed: Record<string, unknown>; filePath: string } {
    const hooksPath = this.paths.hooks || 'settings.json#hooks';
    const [file] = hooksPath.split('#');
    const filePath = scope === 'project' && projectPath
      ? path.join(projectPath, this.paths.projectDir, file)
      : path.join(this.globalHome, file);
    const raw = safeReadFile(filePath);
    let parsed: Record<string, unknown> = {};
    if (raw) {
      try {
        const cleaned = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        parsed = JSON.parse(cleaned);
      } catch { parsed = {}; }
    }
    return { parsed, filePath };
  }

  private writeSettingsJson(filePath: string, data: Record<string, unknown>): void {
    ensureDir(path.dirname(filePath));
    backupFile(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // --- Phase 1: Rules CRUD ---
  createRule(name: string, content: string, scope: 'global' | 'project', projectPath?: string): void {
    const rulesDir = scope === 'project' && projectPath
      ? path.join(projectPath, this.paths.rulesDir?.project || '.claude/rules')
      : resolveHome(this.paths.rulesDir?.global || '~/.claude/rules');
    ensureDir(rulesDir);
    const fileName = name.endsWith('.md') ? name : `${name}.md`;
    fs.writeFileSync(path.join(rulesDir, fileName), content, 'utf-8');
  }

  updateRule(rulePath: string, content: string): void {
    backupFile(rulePath);
    fs.writeFileSync(rulePath, content, 'utf-8');
  }

  deleteRule(rulePath: string): boolean {
    if (fs.existsSync(rulePath)) {
      backupFile(rulePath);
      fs.unlinkSync(rulePath);
      return true;
    }
    return false;
  }

  // --- Phase 2: Skills Edit ---
  updateSkill(skillPath: string, name: string, description: string, content: string): void {
    backupFile(skillPath);
    const skillContent = `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`;
    fs.writeFileSync(skillPath, skillContent, 'utf-8');
  }

  // --- Phase 3: Agent Definitions CRUD ---
  createAgentDef(name: string, description: string, model: string, tools: string[], content: string, scope: 'global' | 'project', projectPath?: string): void {
    if (!this.paths.agents) return;
    const dir = scope === 'project' && projectPath
      ? path.join(projectPath, this.paths.projectDir, this.paths.agents)
      : path.join(this.globalHome, this.paths.agents);
    ensureDir(dir);
    const toolsYaml = tools.length > 0 ? `tools:\n${tools.map(t => `  - ${t}`).join('\n')}` : 'tools: []';
    const fileContent = `---\nname: ${name}\ndescription: ${description}\nmodel: ${model}\n${toolsYaml}\n---\n\n${content}`;
    const fileName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase() + '.md';
    fs.writeFileSync(path.join(dir, fileName), fileContent, 'utf-8');
  }

  updateAgentDef(defPath: string, name: string, description: string, model: string, tools: string[], content: string): void {
    backupFile(defPath);
    const toolsYaml = tools.length > 0 ? `tools:\n${tools.map(t => `  - ${t}`).join('\n')}` : 'tools: []';
    const fileContent = `---\nname: ${name}\ndescription: ${description}\nmodel: ${model}\n${toolsYaml}\n---\n\n${content}`;
    fs.writeFileSync(defPath, fileContent, 'utf-8');
  }

  deleteAgentDef(defPath: string): boolean {
    if (fs.existsSync(defPath)) {
      backupFile(defPath);
      fs.unlinkSync(defPath);
      return true;
    }
    return false;
  }

  // --- Phase 4: MCP Servers CRUD + Toggle ---
  addMcpServer(name: string, command: string, args: string[], env: Record<string, string> | undefined, scope: 'global' | 'project', projectPath?: string): void {
    const { parsed, filePath } = this.readSettingsJson(scope, projectPath);
    if (!parsed.mcpServers) parsed.mcpServers = {};
    const config: Record<string, unknown> = { command, args };
    if (env && Object.keys(env).length > 0) config.env = env;
    (parsed.mcpServers as Record<string, unknown>)[name] = config;
    this.writeSettingsJson(filePath, parsed);
  }

  updateMcpServer(name: string, command: string, args: string[], env: Record<string, string> | undefined, scope: 'global' | 'project', projectPath?: string): void {
    const { parsed, filePath } = this.readSettingsJson(scope, projectPath);
    if (!parsed.mcpServers) parsed.mcpServers = {};
    const config: Record<string, unknown> = { command, args };
    if (env && Object.keys(env).length > 0) config.env = env;
    (parsed.mcpServers as Record<string, unknown>)[name] = config;
    this.writeSettingsJson(filePath, parsed);
  }

  deleteMcpServer(name: string, scope: 'global' | 'project', projectPath?: string): void {
    const { parsed, filePath } = this.readSettingsJson(scope, projectPath);
    if (parsed.mcpServers) {
      delete (parsed.mcpServers as Record<string, unknown>)[name];
    }
    this.writeSettingsJson(filePath, parsed);
  }

  toggleMcpServer(name: string, disabled: boolean, scope: 'global' | 'project', projectPath?: string): void {
    const { parsed, filePath } = this.readSettingsJson(scope, projectPath);
    if (!parsed.mcpServers) return;
    const servers = parsed.mcpServers as Record<string, Record<string, unknown>>;
    if (!servers[name]) return;
    if (disabled) { servers[name].disabled = true; }
    else { delete servers[name].disabled; }
    this.writeSettingsJson(filePath, parsed);
  }

  // --- Phase 5: Hooks CRUD + Toggle ---
  addHook(event: string, matcher: string, hook: { type: string; command: string; timeout?: number }, scope: 'global' | 'project', projectPath?: string): void {
    const { parsed, filePath } = this.readSettingsJson(scope, projectPath);
    if (!parsed.hooks) parsed.hooks = {};
    const hooksConfig = parsed.hooks as Record<string, Array<{ matcher: string; hooks: unknown[] }>>;
    if (!hooksConfig[event]) hooksConfig[event] = [];
    const group = hooksConfig[event].find(g => g.matcher === matcher);
    const hookEntry: Record<string, unknown> = { type: hook.type };
    if (hook.type === 'command') hookEntry.command = hook.command;
    else if (hook.type === 'http') hookEntry.url = hook.command;
    else if (hook.type === 'prompt') hookEntry.prompt = hook.command;
    else hookEntry.command = hook.command;
    if (hook.timeout !== undefined) hookEntry.timeout = hook.timeout;
    if (group) { group.hooks.push(hookEntry); }
    else { hooksConfig[event].push({ matcher, hooks: [hookEntry] }); }
    this.writeSettingsJson(filePath, parsed);
  }

  deleteHook(event: string, matcher: string, hookIndex: number, scope: 'global' | 'project', projectPath?: string): void {
    const { parsed, filePath } = this.readSettingsJson(scope, projectPath);
    const hooksConfig = (parsed.hooks || {}) as Record<string, Array<{ matcher: string; hooks: unknown[] }>>;
    if (!hooksConfig[event]) return;
    const groupIdx = hooksConfig[event].findIndex(g => g.matcher === matcher);
    if (groupIdx === -1) return;
    hooksConfig[event][groupIdx].hooks.splice(hookIndex, 1);
    if (hooksConfig[event][groupIdx].hooks.length === 0) {
      hooksConfig[event].splice(groupIdx, 1);
    }
    if (hooksConfig[event].length === 0) delete hooksConfig[event];
    this.writeSettingsJson(filePath, parsed);
  }

  updateHook(event: string, matcher: string, hookIndex: number, hook: { type: string; command: string; timeout?: number }, scope: 'global' | 'project', projectPath?: string): void {
    const { parsed, filePath } = this.readSettingsJson(scope, projectPath);
    const hooksConfig = (parsed.hooks || {}) as Record<string, Array<{ matcher: string; hooks: Record<string, unknown>[] }>>;
    if (!hooksConfig[event]) return;
    const groupIdx = hooksConfig[event].findIndex(g => g.matcher === matcher);
    if (groupIdx === -1) return;
    const group = hooksConfig[event][groupIdx];
    if (hookIndex < 0 || hookIndex >= group.hooks.length) return;
    const hookEntry: Record<string, unknown> = { type: hook.type, command: hook.command };
    if (hook.timeout !== undefined) hookEntry.timeout = hook.timeout;
    group.hooks[hookIndex] = hookEntry;
    this.writeSettingsJson(filePath, parsed);
  }

  toggleAllHooks(disabled: boolean, scope: 'global' | 'project', projectPath?: string): void {
    const { parsed, filePath } = this.readSettingsJson(scope, projectPath);
    if (disabled) { parsed.disableAllHooks = true; }
    else { delete parsed.disableAllHooks; }
    this.writeSettingsJson(filePath, parsed);
  }

  // --- Phase 6: Permissions CRUD ---
  getPermissions(scope: 'global' | 'project', projectPath?: string): { allow: string[]; deny: string[] } {
    const { parsed } = this.readSettingsJson(scope, projectPath);
    const permissions = (parsed.permissions || {}) as { allow?: string[]; deny?: string[] };
    return {
      allow: Array.isArray(permissions.allow) ? permissions.allow : [],
      deny: Array.isArray(permissions.deny) ? permissions.deny : [],
    };
  }

  addPermission(list: 'allow' | 'deny', entry: string, scope: 'global' | 'project', projectPath?: string): void {
    const { parsed, filePath } = this.readSettingsJson(scope, projectPath);
    if (!parsed.permissions) parsed.permissions = { allow: [], deny: [] };
    const perms = parsed.permissions as { allow: string[]; deny: string[] };
    if (!Array.isArray(perms[list])) perms[list] = [];
    perms[list].push(entry);
    this.writeSettingsJson(filePath, parsed);
  }

  updatePermission(list: 'allow' | 'deny', index: number, entry: string, scope: 'global' | 'project', projectPath?: string): void {
    const { parsed, filePath } = this.readSettingsJson(scope, projectPath);
    const perms = (parsed.permissions || {}) as { allow?: string[]; deny?: string[] };
    if (!Array.isArray(perms[list])) return;
    (perms[list] as string[])[index] = entry;
    this.writeSettingsJson(filePath, parsed);
  }

  deletePermission(list: 'allow' | 'deny', index: number, scope: 'global' | 'project', projectPath?: string): void {
    const { parsed, filePath } = this.readSettingsJson(scope, projectPath);
    const perms = (parsed.permissions || {}) as { allow?: string[]; deny?: string[] };
    if (!Array.isArray(perms[list])) return;
    (perms[list] as string[]).splice(index, 1);
    this.writeSettingsJson(filePath, parsed);
  }

  // --- Phase 7: Plugins Toggle ---
  togglePlugin(pluginKey: string, enabled: boolean): void {
    const settingsLocalPath = path.join(this.globalHome, 'settings.local.json');
    let data: Record<string, unknown> = {};
    try {
      const raw = safeReadFile(settingsLocalPath);
      if (raw) data = JSON.parse(raw);
    } catch { /* ignore */ }
    if (!data.enabledPlugins) data.enabledPlugins = {};
    (data.enabledPlugins as Record<string, boolean>)[pluginKey] = enabled;
    ensureDir(path.dirname(settingsLocalPath));
    backupFile(settingsLocalPath);
    fs.writeFileSync(settingsLocalPath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
