#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import colors from 'picocolors';
import prompts from 'prompts';
import * as tar from 'tar';
import { getTemplate, getTemplatesByCategory, templates } from './templates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const contextSourceDir = path.join(packageRoot, 'context');

const program = new Command();

program
  .name('pubflow')
  .description('Official Pubflow Platform CLI to create apps and manage projects.')
  .version('0.2.0');

program
  .command('init')
  .description('Create a Pubflow project with a guided selector.')
  .option('--no-install', 'Skip dependency installation.')
  .option('--no-git', 'Skip git initialization.')
  .action(async (options) => {
    await runInit(options);
  });

program
  .command('create')
  .description('Create a project from a Pubflow starter kit.')
  .argument('[template]', 'Template id, for example python-backend or react.')
  .argument('[name]', 'Project directory name.')
  .option('--no-install', 'Skip dependency installation.')
  .option('--no-git', 'Skip git initialization.')
  .option('-y, --yes', 'Use sensible defaults.')
  .action(async (templateId, name, options) => {
    if (templateId) {
      await runCreate(templateId, name, options);
    } else {
      await runInit(options);
    }
  });

const contextCommand = program
  .command('context')
  .alias('ctx')
  .description('Install Pubflow context for coding agents and IDEs.');

contextCommand
  .command('init')
  .description('Add Pubflow AI context files to the current project.')
  .option('-y, --yes', 'Use friendly defaults.')
  .option('--full', 'Install all context files instead of the compact guide.')
  .option('--agents', 'Reference Pubflow context from AGENTS.md.')
  .option('--cursor', 'Reference Pubflow context from Cursor rules.')
  .option('--copilot', 'Reference Pubflow context from GitHub Copilot instructions.')
  .option('--claude', 'Reference Pubflow context from CLAUDE.md.')
  .option('--all', 'Reference Pubflow context from every supported agent file.')
  .action(async (options) => {
    await runContextInit(options);
  });

contextCommand
  .command('show')
  .description('Show the local Pubflow context source.')
  .action(() => {
    printContextSource();
  });

const addCommand = program
  .command('add')
  .description('Add Pubflow pieces to an existing project.');

addCommand
  .command('env')
  .description('Add Pubflow env vars to .env.example and optionally .env.')
  .option('-y, --yes', 'Use friendly defaults.')
  .action(async (options) => {
    await runAddEnv(options);
  });

program
  .command('list')
  .alias('ls')
  .description('List available Pubflow starter kits.')
  .action(() => {
    printTemplates();
  });

program
  .command('doctor')
  .description('Check local tools used by Pubflow starters.')
  .action(async () => {
    await runDoctor();
  });

program
  .command('inspect')
  .description('Inspect the current project for Pubflow readiness.')
  .action(async () => {
    await runInspect();
  });

program
  .command('docs')
  .description('Show Pubflow docs and local quick references.')
  .argument('[topic]', 'docs topic: bridge, context, starters, flowfull, flowless, clients')
  .option('--open', 'Open the selected docs URL in your browser.')
  .action(async (topic, options) => {
    await runDocs(topic, options);
  });

program.parseAsync(process.argv).catch((error) => {
  if (error.message) {
    console.error(colors.red(error.message));
  } else {
    console.error(error);
  }
  process.exit(1);
});

async function runInit(options) {
  printHeader();

  const categoryAnswer = await prompts({
    type: 'select',
    name: 'category',
    message: 'What do you want to create?',
    choices: [
      { title: 'Frontend starter', value: 'frontend' },
      { title: 'Backend starter', value: 'backend' },
    ],
  });

  if (!categoryAnswer.category) return;

  const categoryTemplates = getTemplatesByCategory(categoryAnswer.category);
  const templateAnswer = await prompts({
    type: 'select',
    name: 'templateId',
    message: 'Choose a starter kit',
    choices: categoryTemplates.map((template) => ({
      title: `${template.name} - ${template.framework}`,
      description: template.description,
      value: template.id,
    })),
  });

  if (!templateAnswer.templateId) return;

  const nameAnswer = await prompts({
    type: 'text',
    name: 'projectName',
    message: 'Project name',
    initial: suggestProjectName(templateAnswer.templateId),
    validate: validateProjectName,
  });

  if (!nameAnswer.projectName) return;

  const setupAnswer = await prompts([
    {
      type: options.install === false ? null : 'confirm',
      name: 'install',
      message: 'Install dependencies after creating the project?',
      initial: true,
    },
    {
      type: options.git === false ? null : 'confirm',
      name: 'git',
      message: 'Initialize a new git repository?',
      initial: true,
    },
  ]);

  await createProject({
    template: getTemplate(templateAnswer.templateId),
    projectName: nameAnswer.projectName,
    install: options.install === false ? false : setupAnswer.install,
    git: options.git === false ? false : setupAnswer.git,
  });
}

async function runContextInit(options) {
  printHeader();

  if (!(await fs.pathExists(contextSourceDir))) {
    throw new Error(`Pubflow context source was not found: ${contextSourceDir}`);
  }

  const mode = options.full
    ? 'full'
    : options.yes
      ? 'compact'
    : (
        await prompts({
          type: 'select',
          name: 'mode',
          message: 'How much Pubflow context should be installed?',
          choices: [
            {
              title: 'Compact AI guide',
              description: 'Recommended. One focused file for coding agents.',
              value: 'compact',
            },
            {
              title: 'Full context folder',
              description: 'All topic files: architecture, env, clients, starters, middleware patterns.',
              value: 'full',
            },
          ],
          initial: options.full ? 1 : 0,
        })
      ).mode;

  if (!mode) return;

  const explicitTargets = getContextTargetsFromOptions(options);
  const integrationChoices = explicitTargets.length
    ? explicitTargets
    : options.yes
    ? ['agents']
    : (
        await prompts({
          type: 'multiselect',
          name: 'targets',
          message: 'Where should Pubflow context be referenced?',
          choices: [
            { title: 'AGENTS.md', value: 'agents', selected: true },
            { title: 'Cursor rules', value: 'cursor' },
            { title: 'GitHub Copilot instructions', value: 'copilot' },
            { title: 'Claude instructions', value: 'claude' },
          ],
          hint: '- Space to select. Enter to continue.',
        })
      ).targets;

  if (!integrationChoices) return;

  const installedPath =
    mode === 'full' ? await installFullContext(process.cwd()) : await installCompactContext(process.cwd());

  await installContextReferences(process.cwd(), integrationChoices, installedPath);

  console.log('');
  console.log(colors.green('Pubflow context installed.'));
  console.log(`${colors.dim('Context:')} ${path.relative(process.cwd(), installedPath)}`);
  if (integrationChoices.length) {
    console.log(`${colors.dim('References:')} ${integrationChoices.join(', ')}`);
  }
}

async function installCompactContext(projectDir) {
  const targetDir = path.join(projectDir, '.pubflow', 'context');
  await fs.ensureDir(targetDir);

  const target = path.join(targetDir, 'pubflow-context.md');
  await fs.copy(path.join(contextSourceDir, 'pubflow-core.md'), target);
  return target;
}

async function installFullContext(projectDir) {
  const targetDir = path.join(projectDir, '.pubflow', 'context');
  await fs.ensureDir(targetDir);
  await fs.copy(contextSourceDir, targetDir, { overwrite: true });
  return targetDir;
}

async function installContextReferences(projectDir, targets, installedPath) {
  const relativeContextPath = normalizeSlashes(path.relative(projectDir, installedPath));
  const block = [
    'Pubflow is the Trust Layer Standard.',
    `Read \`${relativeContextPath}\` before changing authentication, sessions, middleware, env vars, or starter-kit structure.`,
    'Use POST {FLOWLESS_URL}/auth/bridge/validate with X-Session-ID and X-Bridge-Secret. Prefer Flowfull/backend validation unless the project intentionally supports client-side validation.',
    'Clients may help UI/API ergonomics, but Flowfull still owns backend authorization.',
  ].join('\n');

  for (const target of targets) {
    if (target === 'agents') {
      await upsertMarkedBlock(path.join(projectDir, 'AGENTS.md'), 'Pubflow Context', block);
    }
    if (target === 'cursor') {
      await upsertMarkedBlock(path.join(projectDir, '.cursor', 'rules', 'pubflow.mdc'), 'Pubflow Context', block);
    }
    if (target === 'copilot') {
      await upsertMarkedBlock(path.join(projectDir, '.github', 'copilot-instructions.md'), 'Pubflow Context', block);
    }
    if (target === 'claude') {
      await upsertMarkedBlock(path.join(projectDir, 'CLAUDE.md'), 'Pubflow Context', block);
    }
  }
}

async function runAddEnv(options) {
  printHeader();

  const answers = options.yes
    ? {
        flowlessUrl: 'https://your-flowless-instance.com',
        writeEnv: false,
      }
    : await prompts([
        {
          type: 'text',
          name: 'flowlessUrl',
          message: 'Flowless URL',
          initial: 'https://your-flowless-instance.com',
        },
        {
          type: 'confirm',
          name: 'writeEnv',
          message: 'Also update local .env?',
          initial: false,
        },
      ]);

  if (!answers.flowlessUrl) return;

  const envVars = {
    FLOWLESS_URL: answers.flowlessUrl,
    BRIDGE_VALIDATION_SECRET: 'replace-me',
    PUBFLOW_VALIDATION_MODE: 'standard',
    PUBFLOW_SESSION_COOKIE: 'session_id',
    PUBFLOW_REQUEST_TIMEOUT_MS: '5000',
  };

  await upsertEnvFile(path.join(process.cwd(), '.env.example'), envVars);
  if (answers.writeEnv) {
    await upsertEnvFile(path.join(process.cwd(), '.env'), envVars);
  }

  console.log(colors.green('Pubflow env vars added.'));
  console.log(`${colors.dim('Updated:')} .env.example`);
  if (answers.writeEnv) {
    console.log(`${colors.dim('Updated:')} .env`);
  }
}

async function runInspect() {
  printHeader();

  const projectDir = process.cwd();
  const checks = [];
  checks.push(await inspectPath('.pubflow/context', 'AI context installed'));
  checks.push(await inspectAnyPath(['AGENTS.md', '.cursor/rules/pubflow.mdc', '.github/copilot-instructions.md', 'CLAUDE.md'], 'Agent/editor instructions'));
  checks.push(await inspectPath('.env.example', 'Env example file'));
  checks.push(await inspectEnvVar('.env.example', 'FLOWLESS_URL'));
  checks.push(await inspectAnyEnvVar('.env.example', ['BRIDGE_VALIDATION_SECRET'], 'Bridge validation secret'));
  checks.push(await inspectAnyPath(['package.json', 'pyproject.toml', 'requirements.txt', 'go.mod', 'mix.exs'], 'Project manifest'));

  const detected = await detectProject(projectDir);
  if (detected.length) {
    checks.push({ level: 'ok', label: 'Detected stack', detail: detected.join(', ') });
  } else {
    checks.push({ level: 'warn', label: 'Detected stack', detail: 'No known Pubflow starter shape detected.' });
  }

  for (const check of checks) {
    printCheck(check);
  }

  console.log('');
  console.log(colors.dim('Tip: run `pubflow context init` for AI guidance, or `pubflow add env` for env setup.'));
}

async function runDocs(topic = 'home', options = {}) {
  const docs = getDocsTopic(topic);
  printHeader();
  console.log(colors.bold(docs.title));
  console.log(docs.summary);
  console.log('');
  console.log(colors.bold('Links'));
  for (const link of docs.links) {
    console.log(`  ${colors.green(link.label.padEnd(14))} ${link.url}`);
  }

  if (docs.local) {
    console.log('');
    console.log(colors.bold('Local quick reference'));
    console.log(`  ${docs.local}`);
  }

  if (options.open) {
    await openUrl(docs.links[0].url);
  }
}

async function runCreate(templateId, name, options) {
  const template = getTemplate(templateId);
  if (!template) {
    console.error(colors.red(`Unknown template: ${templateId}`));
    printTemplateHint();
    process.exit(1);
  }

  const projectName =
    name ||
    (options.yes
      ? suggestProjectName(template.id)
      : (
          await prompts({
            type: 'text',
            name: 'projectName',
            message: 'Project name',
            initial: suggestProjectName(template.id),
            validate: validateProjectName,
          })
        ).projectName);

  if (!projectName) return;

  await createProject({
    template,
    projectName,
    install: options.install !== false,
    git: options.git !== false,
  });
}

async function createProject({ template, projectName, install, git }) {
  const targetDir = path.resolve(process.cwd(), projectName);
  await ensureSafeTarget(targetDir);

  printHeader();
  console.log(colors.bold(`Creating ${template.name}`));
  console.log(`${colors.dim('Template:')} ${template.id}`);
  console.log(`${colors.dim('Target:')} ${targetDir}`);
  console.log('');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pubflow-'));

  try {
    const starterDir = await downloadAndExtract(template, tempDir);
    await fs.copy(starterDir, targetDir, {
      filter: (source) => !source.includes(`${path.sep}.git${path.sep}`),
    });
    await personalizeProject(targetDir, projectName);

    if (git) {
      await runCommand('git', ['init'], targetDir, { optional: true });
    }

    if (install) {
      await runInstallCommand(template, targetDir);
    }

    printNextSteps(template, projectName, install);
  } finally {
    await fs.remove(tempDir);
  }
}

async function downloadAndExtract(template, destination) {
  const archivePath = path.join(destination, 'starter.tar.gz');
  const extractDir = path.join(destination, 'starter');
  const branchCandidates = [...new Set([template.branch, 'main', 'master'].filter(Boolean))];

  console.log(colors.cyan('Downloading starter...'));

  const response = await fetchStarterArchive(template.repo, branchCandidates);

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(archivePath, buffer);
  await fs.ensureDir(extractDir);

  console.log(colors.cyan('Extracting files...'));
  await tar.x({
    file: archivePath,
    cwd: extractDir,
    strip: 1,
  });

  return extractDir;
}

async function fetchStarterArchive(repo, branchCandidates) {
  const failures = [];

  for (const branch of branchCandidates) {
    const archiveUrl = `https://codeload.github.com/${repo}/tar.gz/refs/heads/${branch}`;
    const response = await fetch(archiveUrl);
    if (response.ok) {
      return response;
    }
    failures.push(`${branch}: ${response.status} ${response.statusText}`);
  }

  throw new Error(`Could not download ${repo}. Tried ${failures.join(', ')}.`);
}

async function personalizeProject(targetDir, projectName) {
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.name = toPackageName(projectName);
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  const appJsonPath = path.join(targetDir, 'app.json');
  if (await fs.pathExists(appJsonPath)) {
    const appJson = await fs.readJson(appJsonPath);
    if (appJson.expo) {
      appJson.expo.name = projectName;
      appJson.expo.slug = toPackageName(projectName);
    }
    await fs.writeJson(appJsonPath, appJson, { spaces: 2 });
  }

  const envExamplePath = path.join(targetDir, '.env.example');
  const envPath = path.join(targetDir, '.env');
  if ((await fs.pathExists(envExamplePath)) && !(await fs.pathExists(envPath))) {
    await fs.copy(envExamplePath, envPath);
  }
}

async function runInstallCommand(template, targetDir) {
  const [command, ...args] = splitCommand(template.installCommand);
  console.log('');
  console.log(colors.cyan(`Installing dependencies with "${template.installCommand}"...`));
  await runCommand(command, args, targetDir, { optional: true });
}

async function runCommand(command, args, cwd, { optional = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', (error) => {
      if (optional) {
        console.log(colors.yellow(`Skipped: ${command} is not available.`));
        resolve();
      } else {
        reject(error);
      }
    });

    child.on('exit', (code) => {
      if (code === 0 || optional) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}.`));
      }
    });
  });
}

async function ensureSafeTarget(targetDir) {
  if (await fs.pathExists(targetDir)) {
    const entries = await fs.readdir(targetDir);
    if (entries.length > 0) {
      throw new Error(`Target directory already exists and is not empty: ${targetDir}`);
    }
  } else {
    await fs.ensureDir(targetDir);
  }
}

function printTemplates() {
  printHeader();
  printCategory('Frontend starters', getTemplatesByCategory('frontend'));
  printCategory('Backend starters', getTemplatesByCategory('backend'));
}

function printCategory(title, categoryTemplates) {
  console.log(colors.bold(title));
  for (const template of categoryTemplates) {
    console.log(`  ${colors.green(template.id.padEnd(16))} ${template.name} (${template.framework})`);
    console.log(`  ${colors.dim(' '.repeat(16) + template.description)}`);
  }
  console.log('');
}

async function runDoctor() {
  printHeader();

  const checks = [
    ['node', ['--version'], 'Node.js 18+'],
    ['npm', ['--version'], 'npm'],
    ['bun', ['--version'], 'Bun'],
    ['git', ['--version'], 'git'],
    ['python', ['--version'], 'Python'],
    ['go', ['version'], 'Go'],
    ['mix', ['--version'], 'Elixir Mix'],
  ];

  for (const [command, args, label] of checks) {
    const result = await commandWorks(command, args);
    const icon = result.ok ? colors.green('ok') : colors.yellow('missing');
    console.log(`${icon.padEnd(16)} ${label}${result.output ? colors.dim(` - ${result.output}`) : ''}`);
  }
}

function commandWorks(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('error', () => resolve({ ok: false, output: '' }));
    child.on('exit', (code) => {
      resolve({
        ok: code === 0,
        output: output.split(/\r?\n/).find(Boolean)?.trim() || '',
      });
    });
  });
}

function printHeader() {
  console.log(colors.bold(colors.cyan('Pubflow CLI')));
  console.log(colors.dim('Create apps, add context, and build with the Trust Layer Standard.'));
  console.log('');
}

function printTemplateHint() {
  console.log('');
  console.log('Available templates:');
  for (const template of templates) {
    console.log(`  ${template.id}`);
  }
}

function printNextSteps(template, projectName, installed) {
  console.log('');
  console.log(colors.green('Project created.'));
  console.log('');
  console.log(colors.bold('Next steps'));
  console.log(`  cd ${projectName}`);
  if (!installed) {
    console.log(`  ${template.installCommand}`);
  }
  console.log(`  ${template.devCommand}`);
}

function getContextTargetsFromOptions(options) {
  if (options.all) {
    return ['agents', 'cursor', 'copilot', 'claude'];
  }

  const targets = [];
  if (options.agents) targets.push('agents');
  if (options.cursor) targets.push('cursor');
  if (options.copilot) targets.push('copilot');
  if (options.claude) targets.push('claude');
  return targets;
}

function printContextSource() {
  printHeader();
  console.log(`${colors.dim('Source:')} ${contextSourceDir}`);
  console.log('');
  console.log(colors.bold('Available context files'));
  for (const file of [
    'agent-instructions.md',
    'pubflow-core.md',
    'trust-layer-standard.md',
    'architecture.md',
    'bridge-validation.md',
    'flowfull-middleware.md',
    'flowless-auth-routes.md',
    'middleware-patterns.md',
    'env-contract.md',
    'optional-clients.md',
    'starter-kit-map.md',
  ]) {
    console.log(`  ${file}`);
  }
}

async function upsertMarkedBlock(filePath, title, body) {
  await fs.ensureDir(path.dirname(filePath));
  const start = `<!-- ${title}:start -->`;
  const end = `<!-- ${title}:end -->`;
  const block = `${start}\n## ${title}\n\n${body}\n${end}`;
  const existing = (await fs.pathExists(filePath)) ? await fs.readFile(filePath, 'utf8') : '';
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);

  const next = pattern.test(existing)
    ? existing.replace(pattern, block)
    : `${existing.trim() ? `${existing.trim()}\n\n` : ''}${block}\n`;

  await fs.writeFile(filePath, next, 'utf8');
}

async function upsertEnvFile(filePath, vars) {
  await fs.ensureDir(path.dirname(filePath));
  const existing = (await fs.pathExists(filePath)) ? await fs.readFile(filePath, 'utf8') : '';
  const lines = existing.split(/\r?\n/);
  const nextLines = [...lines];

  if (existing.trim() && !existing.includes('# Pubflow')) {
    nextLines.push('');
  }
  if (!existing.includes('# Pubflow')) {
    nextLines.push('# Pubflow');
  }

  for (const [key, value] of Object.entries(vars)) {
    const index = nextLines.findIndex((line) => line.trim().startsWith(`${key}=`));
    if (index >= 0) {
      nextLines[index] = `${key}=${value}`;
    } else {
      nextLines.push(`${key}=${value}`);
    }
  }

  await fs.writeFile(filePath, `${nextLines.join('\n').replace(/\n+$/g, '')}\n`, 'utf8');
}

async function inspectPath(relativePath, label) {
  const exists = await fs.pathExists(path.join(process.cwd(), relativePath));
  return {
    level: exists ? 'ok' : 'warn',
    label,
    detail: exists ? relativePath : `${relativePath} not found`,
  };
}

async function inspectAnyPath(relativePaths, label) {
  for (const relativePath of relativePaths) {
    if (await fs.pathExists(path.join(process.cwd(), relativePath))) {
      return { level: 'ok', label, detail: relativePath };
    }
  }
  return { level: 'warn', label, detail: 'not found' };
}

async function inspectEnvVar(relativePath, key) {
  const filePath = path.join(process.cwd(), relativePath);
  if (!(await fs.pathExists(filePath))) {
    return { level: 'warn', label: key, detail: `${relativePath} not found` };
  }
  const body = await fs.readFile(filePath, 'utf8');
  const found = new RegExp(`^${escapeRegExp(key)}=`, 'm').test(body);
  return {
    level: found ? 'ok' : 'warn',
    label: key,
    detail: found ? 'configured' : `missing from ${relativePath}`,
  };
}

async function inspectAnyEnvVar(relativePath, keys, label) {
  const filePath = path.join(process.cwd(), relativePath);
  if (!(await fs.pathExists(filePath))) {
    return { level: 'warn', label, detail: `${relativePath} not found` };
  }
  const body = await fs.readFile(filePath, 'utf8');
  const found = keys.find((key) => new RegExp(`^${escapeRegExp(key)}=`, 'm').test(body));
  return {
    level: found ? 'ok' : 'info',
    label,
    detail: found ? `${found} configured` : 'required for Bridge Validation',
  };
}

async function detectProject(projectDir) {
  const detected = [];
  if (await fs.pathExists(path.join(projectDir, 'package.json'))) {
    const packageJson = await fs.readJson(path.join(projectDir, 'package.json')).catch(() => ({}));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (deps?.expo) detected.push('Expo / React Native');
    else if (deps?.react) detected.push('React / TypeScript');
    else detected.push('Node / TypeScript');
  }
  if (await fs.pathExists(path.join(projectDir, 'requirements.txt')) || await fs.pathExists(path.join(projectDir, 'pyproject.toml'))) {
    detected.push('Python');
  }
  if (await fs.pathExists(path.join(projectDir, 'go.mod'))) {
    detected.push('Go');
  }
  if (await fs.pathExists(path.join(projectDir, 'mix.exs'))) {
    detected.push('Elixir / Phoenix');
  }
  return detected;
}

function printCheck(check) {
  const icon =
    check.level === 'ok'
      ? colors.green('ok')
      : check.level === 'info'
        ? colors.cyan('info')
        : colors.yellow('warn');
  console.log(`${icon.padEnd(16)} ${check.label}${check.detail ? colors.dim(` - ${check.detail}`) : ''}`);
}

function getDocsTopic(topic = 'home') {
  const topics = {
    home: {
      title: 'Pubflow Documentation',
      summary: 'Official docs and quick references for building Pubflow-based apps.',
      links: [
        { label: 'Pubflow', url: 'https://www.pubflow.com/docs' },
        { label: 'Library', url: 'https://www.pubflow.com/library' },
        { label: 'Flowfull', url: 'https://flowfull.dev/' },
      ],
      local: '`pubflow context init` installs AI-ready local docs into your project.',
    },
    bridge: {
      title: 'Bridge Validation',
      summary: 'Validate opaque sessions with Flowless using POST {FLOWLESS_URL}/auth/bridge/validate, X-Session-ID, and required X-Bridge-Secret. Prefer Flowfull/backend validation unless the project intentionally supports client-side validation.',
      links: [
        { label: 'Flowfull', url: 'https://flowfull.dev/' },
        { label: 'Pubflow', url: 'https://www.pubflow.com/docs' },
      ],
      local: 'Run `pubflow context init --full` and read `.pubflow/context/bridge-validation.md`.',
    },
    context: {
      title: 'AI Context',
      summary: 'Install compact Pubflow rules so coding agents understand Flowless, Flowfull, Bridge Validation, env vars, and starter kits.',
      links: [{ label: 'Pubflow', url: 'https://www.pubflow.com/docs' }],
      local: 'Run `pubflow context init`.',
    },
    starters: {
      title: 'Starter Kits',
      summary: 'Create frontend and backend projects from official Pubflow starter kits.',
      links: [
        { label: 'Library', url: 'https://www.pubflow.com/library' },
        { label: 'Ecosystem', url: 'https://www.pubflow.com/ecosystem' },
      ],
      local: 'Run `pubflow list` or `pubflow create`.',
    },
    flowfull: {
      title: 'Flowfull',
      summary: 'Flowfull is your backend layer: business logic, authorization, routes, and database access.',
      links: [{ label: 'Flowfull', url: 'https://flowfull.dev/' }],
      local: 'Use a backend starter: `node-backend`, `python-backend`, `go-backend`, or `elixir-backend`.',
    },
    flowless: {
      title: 'Flowless',
      summary: 'Flowless is the trust layer: identity, sessions, OAuth, password reset, and validation.',
      links: [
        { label: 'Flowless', url: 'https://flowless.dev/' },
        { label: 'Pubflow', url: 'https://www.pubflow.com/docs' },
      ],
      local: 'Set `FLOWLESS_URL` with `pubflow add env`.',
    },
    clients: {
      title: 'Flowfull Clients',
      summary: 'Optional clients help frontend and language-specific integrations. They do not replace backend Bridge Validation or Flowfull authorization.',
      links: [
        { label: 'Clients', url: 'https://clients.flowfull.dev/' },
        { label: 'Packages', url: 'https://clients.flowfull.dev/packages' },
        { label: 'Starters', url: 'https://clients.flowfull.dev/starter-kits' },
      ],
      local: 'Run `pubflow context init --full` and read `.pubflow/context/optional-clients.md`.',
    },
  };

  return topics[topic] || topics.home;
}

async function openUrl(url) {
  const command =
    process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  await runCommand(command, args, process.cwd(), { optional: true });
}

function normalizeSlashes(value) {
  return value.replace(/\\/g, '/');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateProjectName(value) {
  if (!value?.trim()) return 'Project name is required.';
  if (/[<>:"/\\|?*\x00-\x1F]/.test(value)) return 'Project name contains invalid path characters.';
  return true;
}

function suggestProjectName(templateId) {
  return templateId.replace(/-backend$/, '-api');
}

function toPackageName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitCommand(command) {
  return command.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((part) => part.replace(/^"|"$/g, '')) || [];
}
