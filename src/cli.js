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

const clients = [
  {
    id: 'universal-js',
    name: 'Universal JS client',
    install: 'npm install @pubflow/flowfull-client@latest',
    docs: 'https://clients.flowfull.dev/packages/flowfull-client',
  },
  {
    id: 'react',
    name: 'React client',
    install: 'npm install @pubflow/core@latest @pubflow/react@latest swr zod',
    docs: 'https://clients.flowfull.dev/packages/react',
  },
  {
    id: 'react-native',
    name: 'React Native client',
    install: 'npm install @pubflow/react-native@latest',
    docs: 'https://clients.flowfull.dev/packages/react-native',
  },
  {
    id: 'python',
    name: 'Python client',
    install: 'python -m pip install --upgrade flowfull-python',
    docs: 'https://clients.flowfull.dev/packages/python',
  },
  {
    id: 'go',
    name: 'Go client',
    install: 'go get github.com/pubflow/flowfull-go@latest',
    docs: 'https://clients.flowfull.dev/packages/go',
  },
  {
    id: 'elixir',
    name: 'Elixir client',
    install: 'mix hex.info flowfull',
    docs: 'https://clients.flowfull.dev/packages/elixir',
    manualInstall: 'Add {:flowfull, "~> 0.1.3"} to deps in mix.exs, then run mix deps.get.',
  },
];

const program = new Command();

program
  .name('pubflow')
  .description('Official Pubflow Platform CLI to create apps and manage projects.')
  .version('0.4.0');

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

addCommand
  .command('context')
  .description('Add Pubflow AI context to the current project.')
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

addCommand
  .command('client')
  .description('Add a Flowfull client package to the current project.')
  .argument('[client]', 'Client id: universal-js, react, react-native, python, go, elixir')
  .option('-y, --yes', 'Use the detected recommended client when possible.')
  .option('--no-install', 'Show setup without installing packages.')
  .action(async (clientId, options) => {
    await runAddClient(clientId, options);
  });

addCommand
  .command('middleware')
  .description('Add Bridge Validation middleware to the current backend.')
  .option('-y, --yes', 'Use detected defaults.')
  .action(async (options) => {
    await runAddMiddleware(options);
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

program
  .command('hints')
  .description('Show friendly next-step hints for Pubflow workflows.')
  .argument('[topic]', 'hint topic: next, clients, middleware, env, context')
  .action(async (topic) => {
    await runHints(topic);
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

  const pathAnswer = await prompts({
    type: 'select',
    name: 'path',
    message: 'What are you working on?',
    choices: [
      {
        title: 'New project',
        description: 'Create a Pubflow starter kit.',
        value: 'new',
      },
      {
        title: 'Current project',
        description: 'Add Pubflow pieces to this existing project.',
        value: 'current',
      },
    ],
  });

  if (!pathAnswer.path) return;
  if (pathAnswer.path === 'current') {
    await runExistingProjectInit(options);
    return;
  }

  await runNewProjectInit(options);
}

async function runNewProjectInit(options) {
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

async function runExistingProjectInit(options) {
  const project = await detectProjectInfo(process.cwd());
  if (project.label) {
    console.log(`${colors.dim('Detected:')} ${project.label}${project.packageManager ? ` (${project.packageManager})` : ''}`);
    console.log('');
  }

  const answer = await prompts({
    type: 'multiselect',
    name: 'actions',
    message: 'What do you want to add?',
    choices: [
      {
        title: 'AI context',
        description: 'Install compact Pubflow context for coding agents.',
        value: 'context',
        selected: true,
      },
      {
        title: 'Env vars',
        description: 'Add FLOWLESS_URL and BRIDGE_VALIDATION_SECRET.',
        value: 'env',
        selected: true,
      },
      {
        title: 'Flowfull client',
        description: 'Install the recommended client for this project.',
        value: 'client',
      },
      {
        title: 'Bridge middleware',
        description: 'Add backend middleware for Bridge Validation.',
        value: 'middleware',
      },
    ],
    hint: '- Space to select. Enter to continue.',
  });

  if (!answer.actions?.length) return;

  if (answer.actions.includes('context')) {
    await runContextInit({ yes: true });
  }
  if (answer.actions.includes('env')) {
    await runAddEnv({ yes: true });
  }
  if (answer.actions.includes('client')) {
    await runAddClient(undefined, { yes: true, install: true });
  }
  if (answer.actions.includes('middleware')) {
    await runAddMiddleware({ yes: true });
  }

  console.log('');
  console.log(colors.green('Current project setup complete.'));
  console.log('Run `pubflow inspect` any time to check your setup.');
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
  printHintLines(getHintsTopic('env'));
}

async function runAddClient(clientId, options) {
  printHeader();

  const project = await detectProjectInfo(process.cwd());
  const recommended = recommendClient(project);
  const selectedClientId =
    clientId ||
    (options.yes && recommended ? recommended.id : null) ||
    (
      await prompts({
        type: 'select',
        name: 'clientId',
        message: `${project.label ? `Detected ${project.label}. ` : ''}Which Flowfull client do you want to add?`,
        choices: getClientChoices(recommended?.id),
      })
    ).clientId;

  if (!selectedClientId) return;

  const client = clients.find((item) => item.id === selectedClientId);
  if (!client) {
    throw new Error(`Unknown client: ${selectedClientId}`);
  }

  console.log(colors.bold(`Adding ${client.name}`));
  if (recommended?.id === client.id) {
    console.log(colors.green('Recommended for this project.'));
  }
  console.log(`${colors.dim('Docs:')} ${client.docs}`);

  const installCommand = getClientInstallCommand(client, project.packageManager);
  if (options.install === false) {
    console.log('');
    console.log(colors.bold('Install command'));
    console.log(`  ${client.manualInstall || installCommand}`);
  } else {
    const shouldInstall = options.yes
      ? true
      : (
          await prompts({
            type: 'confirm',
            name: 'install',
            message: `Run "${client.manualInstall || installCommand}" now?`,
            initial: true,
          })
        ).install;

    if (shouldInstall) {
      if (client.manualInstall) {
        console.log(colors.yellow(client.manualInstall));
      } else {
        await runCommandParts(installCommand, process.cwd(), { optional: false });
      }
    }
  }

  await writeClientSetupNote(process.cwd(), client);
  console.log('');
  console.log(colors.green(`${client.name} setup added.`));
  console.log(`${colors.dim('Reference:')} FLOWFULL_CLIENT.md`);
  printHintLines(getHintsTopic('clients'));
}

async function runAddMiddleware(options) {
  printHeader();

  const project = await detectProjectInfo(process.cwd());
  const target = detectMiddlewareTarget(project);
  if (!target) {
    console.log(colors.yellow('Could not confidently detect a supported backend project.'));
    console.log('Supported middleware targets: Node/TypeScript, Python/FastAPI, Go/Gin, Elixir/Phoenix.');
    return;
  }

  const confirmed = options.yes
    ? true
    : (
        await prompts({
          type: 'confirm',
          name: 'confirmed',
          message: `Detected ${project.label}. Add Bridge Validation middleware?`,
          initial: true,
        })
      ).confirmed;

  if (!confirmed) return;

  const namespace = await pickBridgeNamespace(process.cwd(), target);
  const filePath = getMiddlewarePath(process.cwd(), target, namespace);
  if (await fs.pathExists(filePath)) {
    throw new Error(`Middleware file already exists: ${filePath}`);
  }

  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, getMiddlewareSource(target, namespace), 'utf8');

  console.log(colors.green('Bridge Validation middleware added.'));
  console.log(`${colors.dim('Created:')} ${path.relative(process.cwd(), filePath)}`);
  printMiddlewareUsage(target, namespace);
  printHintLines(getHintsTopic('middleware'));
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
  const project = await detectProjectInfo(projectDir);
  if (detected.length) {
    checks.push({ level: 'ok', label: 'Detected stack', detail: detected.join(', ') });
  } else {
    checks.push({ level: 'warn', label: 'Detected stack', detail: 'No known Pubflow starter shape detected.' });
  }
  if (project.packageManager) {
    checks.push({ level: 'ok', label: 'Package manager', detail: project.packageManager });
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

async function runHints(topic) {
  const selectedTopic =
    topic ||
    (
      await prompts({
        type: 'select',
        name: 'topic',
        message: 'What do you want hints for?',
        choices: [
          { title: 'Next steps', value: 'next' },
          { title: 'Clients', value: 'clients' },
          { title: 'Middleware', value: 'middleware' },
          { title: 'Env vars', value: 'env' },
          { title: 'AI context', value: 'context' },
        ],
      })
    ).topic;

  if (!selectedTopic) return;

  const hints = getHintsTopic(selectedTopic);
  printHeader();
  console.log(colors.bold(hints.title));
  for (const line of hints.lines) {
    console.log(`  ${line}`);
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

async function runCommandParts(commandText, cwd, options) {
  const [command, ...args] = splitCommand(commandText);
  console.log('');
  console.log(colors.cyan(`Running "${commandText}"...`));
  await runCommand(command, args, cwd, options);
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

async function detectProjectInfo(projectDir) {
  const info = {
    label: '',
    kind: '',
    framework: '',
    packageManager: await detectPackageManager(projectDir),
  };

  const packageJsonPath = path.join(projectDir, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath).catch(() => ({}));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (deps?.expo || (await fs.pathExists(path.join(projectDir, 'app.json')))) {
      return { ...info, label: 'React Native / Expo project', kind: 'frontend', framework: 'react-native' };
    }
    if (deps?.next) {
      return { ...info, label: 'Next.js project', kind: 'frontend', framework: 'nextjs' };
    }
    if (deps?.react) {
      return { ...info, label: 'React project', kind: 'frontend', framework: 'react' };
    }
    if (deps?.hono || deps?.typescript || packageJson.type === 'module') {
      return { ...info, label: 'Node / TypeScript backend', kind: 'backend', framework: 'node' };
    }
    return { ...info, label: 'Node project', kind: 'backend', framework: 'node' };
  }

  if (await fs.pathExists(path.join(projectDir, 'requirements.txt')) || await fs.pathExists(path.join(projectDir, 'pyproject.toml'))) {
    return { ...info, label: 'Python project', kind: 'backend', framework: 'python' };
  }
  if (await fs.pathExists(path.join(projectDir, 'go.mod'))) {
    return { ...info, label: 'Go project', kind: 'backend', framework: 'go' };
  }
  if (await fs.pathExists(path.join(projectDir, 'mix.exs'))) {
    return { ...info, label: 'Elixir / Phoenix project', kind: 'backend', framework: 'elixir' };
  }

  return info;
}

async function detectPackageManager(projectDir) {
  if (await fs.pathExists(path.join(projectDir, 'bun.lock')) || await fs.pathExists(path.join(projectDir, 'bun.lockb'))) return 'bun';
  if (await fs.pathExists(path.join(projectDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (await fs.pathExists(path.join(projectDir, 'yarn.lock'))) return 'yarn';
  if (await fs.pathExists(path.join(projectDir, 'package-lock.json'))) return 'npm';
  if (await fs.pathExists(path.join(projectDir, 'uv.lock'))) return 'uv';
  if (await fs.pathExists(path.join(projectDir, 'requirements.txt')) || await fs.pathExists(path.join(projectDir, 'pyproject.toml'))) return 'pip';
  if (await fs.pathExists(path.join(projectDir, 'go.mod'))) return 'go';
  if (await fs.pathExists(path.join(projectDir, 'mix.exs'))) return 'mix';
  return '';
}

function recommendClient(project) {
  if (project.framework === 'react') return clients.find((client) => client.id === 'react');
  if (project.framework === 'react-native') return clients.find((client) => client.id === 'react-native');
  if (project.framework === 'nextjs') return clients.find((client) => client.id === 'react');
  if (project.framework === 'python') return clients.find((client) => client.id === 'python');
  if (project.framework === 'go') return clients.find((client) => client.id === 'go');
  if (project.framework === 'elixir') return clients.find((client) => client.id === 'elixir');
  if (project.framework === 'node') return clients.find((client) => client.id === 'universal-js');
  return null;
}

function getClientChoices(recommendedId) {
  return clients.map((client) => ({
    title: `${client.name}${client.id === recommendedId ? ' (Recommended)' : ''}`,
    description: client.docs,
    value: client.id,
  }));
}

async function writeClientSetupNote(projectDir, client) {
  const note = [
    '# Flowfull Client Setup',
    '',
    `Client: ${client.name}`,
    `Docs: ${client.docs}`,
    '',
    'Install:',
    '',
    '```bash',
    client.manualInstall || client.install,
    '```',
    '',
    'Auth flow:',
    '',
    '1. Login/register with Flowless.',
    '2. Store the returned sessionId using the platform storage strategy.',
    '3. Send authenticated Flowfull API requests with X-Session-ID.',
    '4. Keep authorization in Flowfull backend routes/services.',
    '',
  ].join('\n');

  await upsertMarkedBlock(path.join(projectDir, 'FLOWFULL_CLIENT.md'), 'Flowfull Client Setup', note);
}

function getClientInstallCommand(client, packageManager) {
  if (!client.install.startsWith('npm install')) return client.install;
  const packages = client.install.replace(/^npm install\s+/, '');
  if (packageManager === 'bun') return `bun add ${packages}`;
  if (packageManager === 'pnpm') return `pnpm add ${packages}`;
  if (packageManager === 'yarn') return `yarn add ${packages}`;
  return client.install;
}

function detectMiddlewareTarget(project) {
  if (project.framework === 'node') return 'node';
  if (project.framework === 'python') return 'python';
  if (project.framework === 'go') return 'go';
  if (project.framework === 'elixir') return 'elixir';
  return null;
}

async function pickBridgeNamespace(projectDir, target) {
  const bridgePath = getMiddlewarePath(projectDir, target, 'bridge');
  if (!(await fs.pathExists(bridgePath))) return 'bridge';
  return 'pubflow';
}

function getMiddlewarePath(projectDir, target, namespace) {
  if (target === 'node') return path.join(projectDir, 'src', namespace, 'auth.ts');
  if (target === 'python') return path.join(projectDir, 'app', namespace, 'auth.py');
  if (target === 'go') return path.join(projectDir, 'internal', namespace, 'auth.go');
  return path.join(projectDir, 'lib', `${namespace}_auth.ex`);
}

function getMiddlewareSource(target, namespace) {
  if (target === 'node') return getNodeMiddlewareSource();
  if (target === 'python') return getPythonMiddlewareSource();
  if (target === 'go') return getGoMiddlewareSource(namespace);
  return getElixirMiddlewareSource(namespace);
}

function printMiddlewareUsage(target, namespace) {
  console.log('');
  console.log(colors.bold('Try it'));
  if (target === 'node') {
    console.log(`  import { requireAuth, optionalAuth, requireUserType } from './${namespace}/auth';`);
    console.log(`  app.get('/api/me', requireAuth(), handler);`);
  } else if (target === 'python') {
    console.log(`  from app.${namespace}.auth import require_auth`);
    console.log(`  current_user = Depends(require_auth)`);
  } else if (target === 'go') {
    console.log(`  router.GET("/me", ${namespace}.RequireAuth(), handler)`);
  } else {
    console.log(`  plug BridgeAuth.RequireAuth`);
  }
}

function printHintLines(hints) {
  console.log('');
  console.log(colors.bold(hints.title));
  for (const line of hints.lines) {
    console.log(`  ${line}`);
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

function getNodeMiddlewareSource() {
  return `type ValidationMode = 'standard' | 'advanced' | 'strict';

type BridgeUser = {
  id: string;
  email?: string;
  user_type?: string;
  permissions?: string[];
  [key: string]: unknown;
};

type BridgeSession = {
  id?: string;
  userId?: string;
  expiresAt?: string;
  two_factor_verified?: number;
  [key: string]: unknown;
};

export type BridgeAuthContext = {
  user_id?: string;
  user_type?: string;
  email?: string;
  session_id?: string;
  session?: BridgeSession;
  user?: BridgeUser;
  is_guest: boolean;
  permissions?: string[];
};

export async function validateSession(sessionId: string, request: Request, mode: ValidationMode = 'standard'): Promise<BridgeAuthContext | null> {
  const flowlessUrl = process.env.FLOWLESS_URL;
  const bridgeSecret = process.env.BRIDGE_VALIDATION_SECRET;

  if (!flowlessUrl || !bridgeSecret) {
    throw new Error('FLOWLESS_URL and BRIDGE_VALIDATION_SECRET are required.');
  }

  const response = await fetch(\`\${flowlessUrl}/auth/bridge/validate\`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-session-id': sessionId,
      'x-bridge-secret': bridgeSecret,
    },
    body: JSON.stringify({
      validation_mode: mode,
      user_agent: request.headers.get('user-agent'),
    }),
  });

  if (!response.ok) return null;
  const result = await response.json();
  if (!result.success) return null;

  return {
    user_id: result.user?.id,
    user_type: result.user?.user_type,
    email: result.user?.email,
    session_id: result.session?.id ?? sessionId,
    session: result.session,
    user: result.user,
    is_guest: false,
    permissions: result.user?.permissions ?? [],
  };
}

export function getSessionId(request: Request): string | null {
  const header = request.headers.get('x-session-id');
  if (header) return header;
  const cookie = request.headers.get('cookie') || '';
  return cookie.match(/(?:^|; )session_id=([^;]+)/)?.[1] ?? null;
}

export function requireUserType(auth: BridgeAuthContext, allowed: string | string[]) {
  const allowedTypes = Array.isArray(allowed) ? allowed : [allowed];
  return !!auth.user_type && allowedTypes.includes(auth.user_type);
}

export function requirePermission(auth: BridgeAuthContext, permission: string) {
  return auth.user_type === 'admin' || auth.permissions?.includes(permission);
}

export const requireAdmin = (auth: BridgeAuthContext) => requireUserType(auth, ['admin', 'superadmin']);
export const requireSuperadmin = (auth: BridgeAuthContext) => requireUserType(auth, 'superadmin');
`;
}

function getPythonMiddlewareSource() {
  return `import os
from typing import Any

import httpx
from fastapi import HTTPException, Request


def get_session_id(request: Request) -> str | None:
    return request.headers.get("X-Session-ID") or request.cookies.get("session_id")


async def validate_session(request: Request, mode: str = "standard") -> dict[str, Any] | None:
    flowless_url = os.getenv("FLOWLESS_URL")
    bridge_secret = os.getenv("BRIDGE_VALIDATION_SECRET")
    session_id = get_session_id(request)

    if not session_id:
        return None
    if not flowless_url or not bridge_secret:
        raise RuntimeError("FLOWLESS_URL and BRIDGE_VALIDATION_SECRET are required.")

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            f"{flowless_url}/auth/bridge/validate",
            headers={
                "X-Session-ID": session_id,
                "X-Bridge-Secret": bridge_secret,
            },
            json={
                "validation_mode": mode,
                "user_agent": request.headers.get("user-agent"),
            },
        )

    if response.status_code >= 400:
        return None
    data = response.json()
    if not data.get("success"):
        return None

    user = data.get("user") or {}
    return {
        "user_id": user.get("id"),
        "user_type": user.get("user_type"),
        "email": user.get("email"),
        "session_id": (data.get("session") or {}).get("id") or session_id,
        "session": data.get("session"),
        "user": user,
        "is_guest": False,
        "permissions": user.get("permissions") or [],
    }


async def optional_auth(request: Request) -> dict[str, Any]:
    auth = await validate_session(request)
    return auth or {"is_guest": True}


async def require_auth(request: Request) -> dict[str, Any]:
    auth = await validate_session(request)
    if not auth:
        raise HTTPException(status_code=401, detail="Authentication required")
    return auth


def has_user_type(auth: dict[str, Any], allowed: str | list[str]) -> bool:
    allowed_types = [allowed] if isinstance(allowed, str) else allowed
    return auth.get("user_type") in allowed_types


def has_permission(auth: dict[str, Any], permission: str) -> bool:
    return auth.get("user_type") == "admin" or permission in (auth.get("permissions") or [])


def is_admin(auth: dict[str, Any]) -> bool:
    return has_user_type(auth, ["admin", "superadmin"])
`;
}

function getGoMiddlewareSource(namespace) {
  const packageName = namespace === 'pubflow' ? 'pubflow' : 'bridge';
  return `package ${packageName}

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

type AuthContext struct {
	UserID      string         \`json:"user_id"\`
	UserType    string         \`json:"user_type"\`
	Email       string         \`json:"email"\`
	SessionID   string         \`json:"session_id"\`
	Session     map[string]any \`json:"session"\`
	User        map[string]any \`json:"user"\`
	IsGuest     bool           \`json:"is_guest"\`
	Permissions []string       \`json:"permissions"\`
}

func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth, err := ValidateSession(c.Request.Context(), c)
		if err != nil || auth == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication_required"})
			return
		}
		c.Set("bridgeAuth", auth)
		c.Next()
	}
}

func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth, _ := ValidateSession(c.Request.Context(), c)
		if auth == nil {
			auth = &AuthContext{IsGuest: true}
		}
		c.Set("bridgeAuth", auth)
		c.Next()
	}
}

func RequireUserType(types ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		RequireAuth()(c)
		if c.IsAborted() {
			return
		}
		auth := c.MustGet("bridgeAuth").(*AuthContext)
		for _, t := range types {
			if auth.UserType == t {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient_permissions"})
	}
}

func ValidateSession(ctx context.Context, c *gin.Context) (*AuthContext, error) {
	sessionID := c.GetHeader("X-Session-ID")
	if sessionID == "" {
		if cookie, err := c.Cookie("session_id"); err == nil {
			sessionID = cookie
		}
	}
	if sessionID == "" {
		return nil, errors.New("session required")
	}

	flowlessURL := os.Getenv("FLOWLESS_URL")
	bridgeSecret := os.Getenv("BRIDGE_VALIDATION_SECRET")
	if flowlessURL == "" || bridgeSecret == "" {
		return nil, errors.New("FLOWLESS_URL and BRIDGE_VALIDATION_SECRET are required")
	}

	body, _ := json.Marshal(map[string]any{
		"validation_mode": "standard",
		"user_agent":      c.Request.UserAgent(),
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, flowlessURL+"/auth/bridge/validate", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Session-ID", sessionID)
	req.Header.Set("X-Bridge-Secret", bridgeSecret)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, errors.New("invalid session")
	}

	var result struct {
		Success bool           \`json:"success"\`
		User    map[string]any \`json:"user"\`
		Session map[string]any \`json:"session"\`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil || !result.Success {
		return nil, errors.New("invalid session")
	}

	auth := &AuthContext{User: result.User, Session: result.Session, SessionID: sessionID}
	if id, ok := result.User["id"].(string); ok { auth.UserID = id }
	if email, ok := result.User["email"].(string); ok { auth.Email = email }
	if userType, ok := result.User["user_type"].(string); ok { auth.UserType = userType }
	return auth, nil
}
`;
}

function getElixirMiddlewareSource(namespace) {
  const modulePrefix = namespace === 'pubflow' ? 'PubflowAuth' : 'BridgeAuth';
  return `defmodule ${modulePrefix} do
  @endpoint "/auth/bridge/validate"

  def validate_session(conn) do
    session_id = Plug.Conn.get_req_header(conn, "x-session-id") |> List.first() || conn.req_cookies["session_id"]
    flowless_url = System.get_env("FLOWLESS_URL")
    bridge_secret = System.get_env("BRIDGE_VALIDATION_SECRET")

    cond do
      is_nil(session_id) -> {:error, :missing_session}
      is_nil(flowless_url) or is_nil(bridge_secret) -> {:error, :missing_config}
      true -> request_validation(flowless_url, bridge_secret, session_id)
    end
  end

  defp request_validation(flowless_url, bridge_secret, session_id) do
    body = Jason.encode!(%{validation_mode: "standard"})
    headers = [
      {"content-type", "application/json"},
      {"x-session-id", session_id},
      {"x-bridge-secret", bridge_secret}
    ]

    case :httpc.request(:post, {String.to_charlist(flowless_url <> @endpoint), headers, 'application/json', body}, [], []) do
      {:ok, {{_, status, _}, _, response}} when status in 200..299 ->
        data = Jason.decode!(to_string(response))
        if data["success"], do: {:ok, normalize(data, session_id)}, else: {:error, :invalid_session}
      _ ->
        {:error, :invalid_session}
    end
  end

  defp normalize(data, session_id) do
    user = data["user"] || %{}
    %{
      user_id: user["id"],
      user_type: user["user_type"],
      email: user["email"],
      session_id: get_in(data, ["session", "id"]) || session_id,
      session: data["session"],
      user: user,
      is_guest: false,
      permissions: user["permissions"] || []
    }
  end
end

defmodule ${modulePrefix}.RequireAuth do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    case ${modulePrefix}.validate_session(conn) do
      {:ok, auth} -> assign(conn, :bridge_auth, auth)
      {:error, _} -> conn |> send_resp(401, ~s({"error":"authentication_required"})) |> halt()
    end
  end
end

defmodule ${modulePrefix}.OptionalAuth do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    case ${modulePrefix}.validate_session(conn) do
      {:ok, auth} -> assign(conn, :bridge_auth, auth)
      {:error, _} -> assign(conn, :bridge_auth, %{is_guest: true})
    end
  end
end
`;
}

function getHintsTopic(topic = 'next') {
  const topics = {
    next: {
      title: 'Recommended Next Steps',
      lines: [
        '`pubflow create` to start a frontend or backend starter.',
        '`pubflow add context` so agents understand Flowless, Flowfull, and Bridge Validation.',
        '`pubflow add env` to add FLOWLESS_URL and BRIDGE_VALIDATION_SECRET.',
        '`pubflow inspect` to check the project setup.',
      ],
    },
    clients: {
      title: 'Client Hints',
      lines: [
        'Detected React apps should recommend React client first.',
        'Detected React Native/Expo apps should recommend React Native client first.',
        'Backend projects can use language clients: Python, Go, Elixir, or universal JS.',
        'Prefer latest install commands when package managers support it.',
        'Current known versions: @pubflow/flowfull-client 0.2.5, @pubflow/core 0.4.6, @pubflow/react 0.4.14, @pubflow/react-native 0.4.1, flowfull-python 1.0.0, flowfull-go v0.2.0, flowfull elixir ~> 0.1.3.',
      ],
    },
    middleware: {
      title: 'Middleware Hints',
      lines: [
        'Use `bridge` as the generated folder/module name first.',
        'Use `pubflow` only as fallback if `bridge` already exists.',
        'Generate reusable helpers: optionalAuth, requireAuth, requireUserType, requirePermission, requireAdmin.',
        'Do not scatter Bridge Validation calls across route handlers.',
        'After middleware is added, show an example route and suggest `pubflow inspect`.',
      ],
    },
    env: {
      title: 'Env Hints',
      lines: [
        'Required for Bridge Validation: FLOWLESS_URL and BRIDGE_VALIDATION_SECRET.',
        'Write placeholders to .env.example.',
        'Only write .env after user confirmation.',
        'Never generate real secrets.',
      ],
    },
    context: {
      title: 'Context Hints',
      lines: [
        '`pubflow add context` is an alias for `pubflow context init`.',
        'Compact mode installs one short core file for agents.',
        'Full mode installs all reference files.',
        'AGENTS.md/Cursor/Copilot/Claude files should be short pointers, not duplicated docs.',
      ],
    },
  };

  return topics[topic] || topics.next;
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
