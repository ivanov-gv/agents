import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {handle, globToRegExp, pathsFromToolInput, loadConfig} from '../plugins/agents/hooks/guidelines.mjs';

const pluginRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../plugins/agents');

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-repo-'));
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true});
    fs.writeFileSync(path.join(dir, f), '');
  }
  return dir;
}
const skillsIn = out => [...(out?.hookSpecificOutput.additionalContext ?? '').matchAll(/skill="agents:([\w-]+)"/g)].map(m => m[1]).sort();

test('globs', () => {
  assert.ok(globToRegExp('**/*.go').test('main.go'));
  assert.ok(globToRegExp('**/*.go').test('a/b/c.go'));
  assert.ok(globToRegExp('.github/**').test('.github/workflows/ci.yml'));
  assert.ok(!globToRegExp('**/*_test.go').test('main.go'));
});

test('path extraction for Claude, Codex patches and shell commands', () => {
  const repo = '/r';
  assert.deepEqual(pathsFromToolInput({file_path: '/r/internal/app/app.go'}, repo), ['internal/app/app.go']);
  assert.ok(pathsFromToolInput({input: '*** Begin Patch\n*** Update File: cmd/x/main.go\n*** End Patch'}, repo).includes('cmd/x/main.go'));
  assert.ok(pathsFromToolInput({command: 'sed -n 1,20p .github/workflows/ci.yml'}, repo).includes('.github/workflows/ci.yml'));
  assert.ok(pathsFromToolInput({command: 'cat deploy/Dockerfile'}, repo).includes('deploy/Dockerfile'));
});

test('every mapped skill exists', () => {
  for (const g of loadConfig(pluginRoot).guidelines) assert.ok(fs.existsSync(path.join(pluginRoot, 'skills', g.skill, 'SKILL.md')), g.skill);
});

test('Claude: Go work loads Go rules once, before the edit, without unrelated rules', () => {
  const repo = fixture(['go.mod', 'main.go']);
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-state-'));
  const opts = {root: pluginRoot, stateDir};
  const base = {session_id: 's', cwd: repo};
  assert.equal(handle({...base, hook_event_name: 'SessionStart', source: 'startup'}, opts), null);
  const read = {...base, hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: {file_path: path.join(repo, 'main.go')}};
  assert.deepEqual(skillsIn(handle(read, opts)), ['code-general', 'code-golang-conventions']);
  assert.equal(handle(read, opts), null, 'deduplicated');
  assert.equal(handle({...read, hook_event_name: 'PostToolUse'}, opts), null, 'Claude uses PreToolUse only');

  const testFile = {...read, tool_input: {file_path: path.join(repo, 'main_test.go')}};
  assert.deepEqual(skillsIn(handle(testFile, opts)), ['code-general-testing', 'code-golang-testing']);

  const sub = {...read, agent_id: 'a1'};
  assert.deepEqual(skillsIn(handle(sub, opts)), ['code-general', 'code-golang-conventions'], 'subagents get their own copy');

  const restored = handle({...base, hook_event_name: 'SessionStart', source: 'compact'}, opts);
  assert.deepEqual(skillsIn(restored), ['code-general', 'code-general-testing', 'code-golang-conventions', 'code-golang-testing']);
  const log = fs.readFileSync(path.join(stateDir, 'injections.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  assert.ok(log.every(l => /^[a-f0-9]{12}$/.test(l.sha256) && l.agent === 'claude'));
});

test('Codex: injects on PostToolUse and prompt, never on PreToolUse', () => {
  const repo = fixture(['go.mod']);
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-state-'));
  const opts = {root: pluginRoot, stateDir};
  const base = {session_id: 'c', turn_id: 't1', cwd: repo};
  const patch = {...base, tool_name: 'apply_patch', tool_input: {input: '*** Begin Patch\n*** Add File: .github/workflows/ci.yml\n+x\n*** End Patch'}};
  assert.equal(handle({...patch, hook_event_name: 'PreToolUse'}, opts), null);
  const ci = handle({...patch, hook_event_name: 'PostToolUse'}, opts);
  assert.deepEqual(skillsIn(ci), ['cicd-general', 'cicd-github'], 'GitHub workflows get the general and GitHub rules');
  const docLink = ci.hookSpecificOutput.additionalContext.match(/\]\((\/[^)#]+docs\/cicd\/[\w-]+\.md)/);
  assert.ok(docLink && fs.existsSync(docLink[1]), 'doc links are absolute and resolve');
  assert.deepEqual(skillsIn(handle({...base, hook_event_name: 'UserPromptSubmit', prompt: 'add golangci config'}, opts)), ['code-golang-conventions', 'code-golang-lint']);
});

test('requires: Go Docker rules only in Go repositories', () => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-state-'));
  const node = fixture(['package.json']);
  const go = fixture(['go.mod']);
  const ev = cwd => ({session_id: cwd, cwd, hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: {file_path: path.join(cwd, 'Dockerfile')}});
  assert.equal(handle(ev(node), {root: pluginRoot, stateDir}), null);
  assert.deepEqual(skillsIn(handle(ev(go), {root: pluginRoot, stateDir})), ['code-golang-docker']);
});

test('ordinary prompts inject nothing', () => {
  const repo = fixture([]);
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-state-'));
  assert.equal(handle({session_id: 'p', cwd: repo, hook_event_name: 'UserPromptSubmit', prompt: 'go ahead and summarise the meeting notes'}, {root: pluginRoot, stateDir}), null);
});

test('non-workflow files under .github do not load CI rules', () => {
  const repo = fixture([]);
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-state-'));
  const ev = {session_id: 'g', cwd: repo, hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: {file_path: path.join(repo, '.github/CODEOWNERS')}};
  assert.equal(handle(ev, {root: pluginRoot, stateDir}), null);
});
