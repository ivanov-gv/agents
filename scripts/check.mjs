#!/usr/bin/env node
// Repository checks: node scripts/check.mjs (run before committing; also runs the hook tests).
// - every skill has name (= directory) and a non-empty one-line description
// - guidelines.json references existing skills, valid globs/regexes, and bounded sizes
// - Claude and Codex manifests agree on name/version/description; both marketplaces point at the plugin
// - AGENTS.md/README.md mention every skill, so docs cannot silently go stale
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plugin = path.join(root, 'plugins/agents');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const json = f => JSON.parse(read(f));
const problems = [];
const fail = msg => problems.push(msg);

const skills = fs.readdirSync(path.join(plugin, 'skills'), {withFileTypes: true}).filter(e => e.isDirectory()).map(e => e.name).sort();
for (const skill of skills) {
  const file = `plugins/agents/skills/${skill}/SKILL.md`;
  const fm = read(file).match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) { fail(`${file}: missing YAML frontmatter`); continue; }
  const fields = Object.fromEntries(fm[1].split('\n').map(l => l.match(/^(\w[\w-]*):\s*(.*)$/)).filter(Boolean).map(m => [m[1], m[2]]));
  if (fields.name !== skill) fail(`${file}: name must be "${skill}"`);
  const desc = (fields.description || '').replace(/^"|"$/g, '');
  if (!desc) fail(`${file}: description is required; agents choose skills by it`);
  if (desc.length > 1024) fail(`${file}: description over 1024 characters`);
  if (/: /.test(fields.description || '') && !/^".*"$/.test(fields.description)) fail(`${file}: quote descriptions containing ": "`);
  for (const key of Object.keys(fields)) if (!['name', 'description'].includes(key)) fail(`${file}: unsupported frontmatter field "${key}"`);
}

const config = json('plugins/agents/guidelines.json');
const seen = new Set();
for (const g of config.guidelines) {
  if (!skills.includes(g.skill)) fail(`guidelines.json: unknown skill ${g.skill}`);
  if (seen.has(g.skill)) fail(`guidelines.json: duplicate skill ${g.skill}`);
  seen.add(g.skill);
  if (!g.paths?.length && !g.prompt) fail(`guidelines.json: ${g.skill} has no trigger`);
  if (g.prompt) { try { new RegExp(g.prompt, 'i'); } catch (e) { fail(`guidelines.json: ${g.skill} prompt: ${e.message}`); } }
  const size = skills.includes(g.skill) ? fs.statSync(path.join(plugin, 'skills', g.skill, 'SKILL.md')).size : 0;
  if (size > config.limits.guidelineMaxBytes) fail(`skills/${g.skill}: ${size} bytes exceeds ${config.limits.guidelineMaxBytes}; it is injected whole, so split or trim it`);
}

const claude = json('plugins/agents/.claude-plugin/plugin.json');
const codex = json('plugins/agents/.codex-plugin/plugin.json');
for (const key of ['name', 'version', 'description']) if (claude[key] !== codex[key]) fail(`plugin.json ${key} differs between .claude-plugin and .codex-plugin`);
if (codex.skills !== './skills/') fail('.codex-plugin/plugin.json: skills must be "./skills/" (directory discovery, no hand-maintained list)');
const claudeMarket = json('.claude-plugin/marketplace.json');
const codexMarket = json('.agents/plugins/marketplace.json');
if (claudeMarket.plugins[0]?.source !== './plugins/agents') fail('.claude-plugin/marketplace.json: source must be ./plugins/agents');
if (codexMarket.plugins[0]?.source?.path !== './plugins/agents') fail('.agents/plugins/marketplace.json: source.path must be ./plugins/agents');
if (claudeMarket.name !== codexMarket.name) fail('marketplace names differ between Claude and Codex');
try { json('plugins/agents/hooks/hooks.json'); } catch (e) { fail(`hooks.json: ${e.message}`); }

// Docs: every doc is indexed, names its rules skill, and every relative link in skills/docs resolves.
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const docsDir = path.join(plugin, 'docs');
const docs = walk(docsDir).filter(f => f.endsWith('.md') && path.basename(f) !== 'README.md').map(f => path.relative(docsDir, f));
const docsIndex = fs.readFileSync(path.join(docsDir, 'README.md'), 'utf8');
for (const doc of docs) {
  if (!docsIndex.includes(`](${doc})`)) fail(`docs/README.md: does not index ${doc}`);
  const fm = fs.readFileSync(path.join(docsDir, doc), 'utf8').match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm || !/^summary: \S/m.test(fm[1]) || !/^rules: \S/m.test(fm[1]) || !/^updated: \d{4}-\d{2}-\d{2}$/m.test(fm[1])) fail(`docs/${doc}: frontmatter needs summary, rules and updated`);
  const rules = fm?.[1].match(/^rules: (.+)$/m)?.[1];
  if (rules && !fs.existsSync(path.resolve(docsDir, path.dirname(doc), rules))) fail(`docs/${doc}: rules points to missing ${rules}`);
}
const slug = h => h.toLowerCase().trim().replace(/[^\w\- ]/g, '').replace(/ /g, '-');
for (const file of [...walk(path.join(plugin, 'skills')), ...walk(docsDir)].filter(f => f.endsWith('.md'))) {
  const text = fs.readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z]+:/i.test(m[1])) continue;
    const [target, anchor] = m[1].split('#');
    const abs = target ? path.resolve(path.dirname(file), target) : file;
    const rel = path.relative(root, file);
    if (!fs.existsSync(abs)) { fail(`${rel}: broken link ${m[1]}`); continue; }
    if (anchor && !fs.readFileSync(abs, 'utf8').split('\n').some(l => /^#+ /.test(l) && slug(l.replace(/^#+ /, '')) === anchor)) fail(`${rel}: missing anchor #${anchor} in ${target}`);
  }
}
const linkedDocs = new Set(walk(path.join(plugin, 'skills')).flatMap(f => [...fs.readFileSync(f, 'utf8').matchAll(/\]\(\.\.\/\.\.\/docs\/([^)#]+)/g)].map(m => m[1])));
for (const doc of docs) if (!linkedDocs.has(doc) && !docs.some(d => fs.readFileSync(path.join(docsDir, d), 'utf8').includes(path.basename(doc)) && d !== doc)) fail(`docs/${doc}: not linked from any skill or doc`);

for (const doc of ['AGENTS.md', 'README.md']) {
  const text = read(doc);
  for (const skill of skills) if (!text.includes(`\`${skill}\``)) fail(`${doc}: does not mention skill \`${skill}\``);
}

const tests = spawnSync(process.execPath, ['--test', path.join(root, 'scripts/guidelines.test.mjs')], {stdio: 'inherit'});
if (tests.status !== 0) fail('hook tests failed');
const sh = spawnSync('bash', ['-n', path.join(plugin, 'hooks/inject-subagent-skills.sh'), path.join(root, 'install.sh')], {stdio: 'inherit'});
if (sh.status !== 0) fail('shell syntax check failed');

if (problems.length) {
  console.error(problems.map(p => `check: ${p}`).join('\n'));
  process.exit(1);
}
console.log(`check: OK (${skills.length} skills, ${config.guidelines.length} path-delivered)`);
