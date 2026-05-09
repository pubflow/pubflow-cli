#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import colors from 'picocolors';
import prompts from 'prompts';
import * as tar from 'tar';
import { getTemplate, getTemplatesByCategory, templates } from './templates.js';

const program = new Command();

program
  .name('pubflow')
  .description('Friendly project creator for Pubflow starter kits.')
  .version('0.1.0');

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
  .argument('<template>', 'Template id, for example python-backend or react.')
  .argument('[name]', 'Project directory name.')
  .option('--no-install', 'Skip dependency installation.')
  .option('--no-git', 'Skip git initialization.')
  .option('-y, --yes', 'Use sensible defaults.')
  .action(async (templateId, name, options) => {
    await runCreate(templateId, name, options);
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
  console.log(colors.dim('Create Pubflow starter projects without ceremony.'));
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
