#!/usr/bin/env node
// Deliver mandatory skills (guidelines.json) deterministically, for Claude Code and Codex.
// Skills are model-invoked and often skipped, so rules that must hold are injected by path or prompt instead:
//   SessionStart       reset per-session state; after compaction, restore everything injected before
//   UserPromptSubmit   inject guidelines whose `prompt` pattern matches
//   PreToolUse         Claude: inject before Read/Edit/Write/Bash touches a matching path
//   PostToolUse        Codex: same, after the tool call (Codex PreToolUse cannot add context)
// Each guideline is injected once per session and agent (subagents count separately). Every injection
// is logged with its content hash. Standard library only. The hook never blocks; on error it injects nothing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadConfig(root = pluginRoot) {
  return JSON.parse(fs.readFileSync(path.join(root, 'guidelines.json'), 'utf8'));
}

export function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      if (glob[i + 2] === '/') { out += '(?:.*/)?'; i += 2; } else { out += '.*'; i += 1; }
    } else if (c === '*') out += '[^/]*';
    else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
}

export function matchesPath(guideline, rel) {
  return guideline.paths?.some(p => globToRegExp(p).test(rel)) ?? false;
}

// Repository-relative paths named by a tool call: Claude file_path/path/notebook_path, Codex apply_patch
// headers, and path-like tokens in shell commands.
export function pathsFromToolInput(toolInput, repo) {
  const found = new Set();
  const add = raw => {
    let p = String(raw).trim().replace(/^['"]|['"]$/g, '');
    if (!p) return;
    if (path.isAbsolute(p)) p = path.relative(repo, p);
    p = p.replace(/\\/g, '/').replace(/^\.\//, '');
    if (p && !p.startsWith('../')) found.add(p);
  };
  if (toolInput && typeof toolInput === 'object') {
    for (const key of ['file_path', 'path', 'notebook_path']) if (typeof toolInput[key] === 'string') add(toolInput[key]);
  }
  const text = (typeof toolInput === 'string' ? toolInput : JSON.stringify(toolInput ?? {})).replace(/\\n/g, '\n');
  for (const m of text.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)) add(m[1]);
  for (const m of text.matchAll(/^\*\*\* Move to: (.+)$/gm)) add(m[1]);
  for (const m of text.matchAll(/(?:^|[\s'"=:(])((?:\/|\.\/)?(?:[\w@.-]+\/)*(?:[\w@-][\w@.-]*\.[A-Za-z]{1,12}|Dockerfile[\w.-]*|Jenkinsfile|go\.mod|go\.sum|go\.work))(?=$|[\s'"),;:])/gm)) add(m[1]);
  return [...found];
}

function repoRootOf(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
  } catch {
    return cwd;
  }
}

export function readSkill(skill, root = pluginRoot) {
  const text = fs.readFileSync(path.join(root, 'skills', skill, 'SKILL.md'), 'utf8');
  const skillDir = path.join(root, 'skills', skill);
  // Relative links (e.g. ../../docs/x.md) would resolve against the project, so make them absolute.
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '').trim()
    .replace(/\]\((?![a-z]+:|#|\/)([^)]+)\)/gi, (_, target) => `](${path.resolve(skillDir, target)})`);
  return {body, hash: crypto.createHash('sha256').update(text).digest('hex').slice(0, 12)};
}

function stateDirectory() {
  if (process.env.CLAUDE_PLUGIN_DATA) return path.join(process.env.CLAUDE_PLUGIN_DATA, 'guidelines');
  const base = process.env.XDG_STATE_HOME || (process.env.HOME ? path.join(process.env.HOME, '.local/state') : os.tmpdir());
  return path.join(base, 'ivanov-gv-agents', 'guidelines');
}

export function handle(input, {root = pluginRoot, stateDir = stateDirectory()} = {}) {
  const config = loadConfig(root);
  const event = input.hook_event_name;
  const isCodex = 'turn_id' in input;
  const cwd = input.cwd || process.cwd();
  const repo = repoRootOf(cwd);
  const actor = input.agent_id ? `agent-${input.agent_id}` : 'main';
  const key = `${String(input.session_id || 'unknown')}-${actor}`.replace(/[^\w-]/g, '_');
  const stateFile = path.join(stateDir, `${key}.json`);
  let state = {loaded: {}};
  try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { /* new session */ }

  const applicable = config.guidelines.filter(g => (g.requires ?? []).every(f => fs.existsSync(path.join(repo, f))));
  let wanted = [];
  if (event === 'SessionStart') {
    const previous = Object.keys(state.loaded);
    state = {loaded: {}};
    if (input.source === 'compact') wanted = applicable.filter(g => previous.includes(g.skill));
  } else if (event === 'UserPromptSubmit') {
    const prompt = String(input.prompt || '');
    wanted = applicable.filter(g => g.prompt && new RegExp(g.prompt, 'i').test(prompt));
  } else if ((event === 'PreToolUse' && !isCodex) || (event === 'PostToolUse' && isCodex)) {
    const files = pathsFromToolInput(input.tool_input, repo);
    wanted = applicable.filter(g => files.some(f => matchesPath(g, f)));
  }

  const parts = [];
  const log = [];
  for (const g of wanted) {
    const {body, hash} = readSkill(g.skill, root);
    if (state.loaded[g.skill] === hash) continue;
    state.loaded[g.skill] = hash;
    parts.push(`<guideline skill="agents:${g.skill}" sha256="${hash}">\n${body}\n</guideline>`);
    log.push({at: new Date().toISOString(), agent: isCodex ? 'codex' : 'claude', session: key, event, repo, skill: g.skill, sha256: hash});
  }

  fs.mkdirSync(stateDir, {recursive: true});
  fs.writeFileSync(stateFile, JSON.stringify(state));
  if (log.length) fs.appendFileSync(path.join(stateDir, 'injections.jsonl'), log.map(l => JSON.stringify(l)).join('\n') + '\n');
  if (!parts.length) return null;
  return {hookSpecificOutput: {hookEventName: event, additionalContext:
    `Mandatory guidelines for the files and task at hand (from the agents plugin). Follow them for every change in their scope; project instructions take precedence where they conflict.\n\n${parts.join('\n\n')}`}};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let raw = '';
  process.stdin.on('data', c => { raw += c; });
  process.stdin.on('end', () => {
    try {
      const out = handle(JSON.parse(raw || '{}'));
      if (out) process.stdout.write(JSON.stringify(out));
    } catch (error) {
      process.stderr.write(`agents guidelines hook: ${error.message}\n`);
    }
  });
}
