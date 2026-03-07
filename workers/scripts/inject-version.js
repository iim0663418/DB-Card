#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Read version from package.json
const packagePath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = pkg.version;

console.log(`📦 Injecting version: ${version}`);

// 1. Update frontend config.js
const configPath = path.join(__dirname, '../public/js/config.js');
const configContent = fs.readFileSync(configPath, 'utf8');
const updatedConfig = configContent.replace(
  /export const APP_VERSION = '[^']+';/,
  `export const APP_VERSION = '${version}';`
);
fs.writeFileSync(configPath, updatedConfig, 'utf8');
console.log('✓ Updated public/js/config.js');

// 2. Update backend config.ts
const backendConfigPath = path.join(__dirname, '../src/config.ts');
const backendConfigContent = fs.readFileSync(backendConfigPath, 'utf8');
const updatedBackendConfig = backendConfigContent.replace(
  /export const APP_VERSION = 'v[^']+';/,
  `export const APP_VERSION = 'v${version}';`
);
fs.writeFileSync(backendConfigPath, updatedBackendConfig, 'utf8');
console.log('✓ Updated src/config.ts');

// 2. Update wrangler.toml
const wranglerPath = path.join(__dirname, '../wrangler.toml');
const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
const updatedWrangler = wranglerContent.replace(
  /# Version: v[^\n]+/,
  `# Version: v${version}`
);
fs.writeFileSync(wranglerPath, updatedWrangler, 'utf8');
console.log('✓ Updated wrangler.toml');

// 3. Update README.md
const readmePath = path.join(__dirname, '../../README.md');
const readmeContent = fs.readFileSync(readmePath, 'utf8');
const updatedReadme = readmeContent.replace(
  /# DB-Card - NFC 數位名片系統 v[^\n]+/,
  `# DB-Card - NFC 數位名片系統 v${version}`
);
fs.writeFileSync(readmePath, updatedReadme, 'utf8');
console.log('✓ Updated README.md');

console.log(`✅ Version ${version} injected successfully`);
