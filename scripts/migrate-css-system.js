#!/usr/bin/env node

/**
 * CSS System Migration Helper Script
 * Helps migrate from old CSS/theme system to new unified system
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  srcDir: path.join(process.cwd(), 'src'),
  
  // Files to check for deprecated imports
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
  
  // Deprecated imports to find
  deprecatedImports: [
    // CSS files
    { old: 'design-tokens.css', new: 'unified-design-tokens.css' },
    { old: 'dark-mode.css', new: 'dark-mode-consolidated.css' },
    { old: 'theme-utilities.css', new: null }, // Use Tailwind instead
    { old: 'animations.css', new: 'animations-optimized.css' },
    { old: 'interactions.css', new: null }, // Load on demand
    { old: 'z-index.css', new: null }, // In unified tokens
    { old: 'layout.css', new: null }, // Use Tailwind
    { old: 'typography.css', new: null }, // In unified tokens
    
    // Theme imports
    { old: '@/theme', new: null }, // Remove entirely
    { old: '../theme', new: null },
    { old: './theme', new: null },
  ],
  
  // Deprecated CSS variables
  deprecatedVars: [
    { old: '--colors-', new: '--color-' },
    { old: '--border-radius-', new: '--radius-' },
    { old: '--shadows-', new: '--shadow-' },
    { old: '--paradigm-accent', new: '--color-paradigm-accent' },
    { old: '--animation-color', new: '--color-animation' },
  ],
  
  // Files to skip
  skipFiles: [
    'node_modules',
    'dist',
    'build',
    '.git',
    'scripts/migrate-css-system.js',
  ]
};

// Tracking
const issues = [];
let filesChecked = 0;
let issuesFound = 0;

// Helper functions
function shouldSkipFile(filePath) {
  return config.skipFiles.some(skip => filePath.includes(skip));
}

function checkFile(filePath) {
  if (shouldSkipFile(filePath)) return;
  
  const ext = path.extname(filePath);
  if (!config.extensions.includes(ext)) return;
  
  filesChecked++;
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Check for deprecated imports
  config.deprecatedImports.forEach(({ old, new: replacement }) => {
    if (content.includes(old)) {
      issuesFound++;
      issues.push({
        file: relativePath,
        type: 'import',
        old,
        new: replacement,
        line: getLineNumber(content, old)
      });
    }
  });
  
  // Check for deprecated CSS variables in CSS files
  if (ext === '.css') {
    config.deprecatedVars.forEach(({ old, new: replacement }) => {
      const regex = new RegExp(escapeRegex(old), 'g');
      const matches = content.match(regex);
      if (matches) {
        issuesFound += matches.length;
        issues.push({
          file: relativePath,
          type: 'css-var',
          old,
          new: replacement,
          count: matches.length
        });
      }
    });
  }
  
  // Check for theme hook usage in TS/TSX files
  if (ext === '.ts' || ext === '.tsx') {
    const themeHooks = ['useTheme', 'useThemeMode', 'useThemeColors', 'useParadigmTheme'];
    themeHooks.forEach(hook => {
      if (content.includes(hook)) {
        issuesFound++;
        issues.push({
          file: relativePath,
          type: 'theme-hook',
          hook,
          line: getLineNumber(content, hook)
        });
      }
    });
    
    // Check for ThemeProvider
    if (content.includes('ThemeProvider')) {
      issuesFound++;
      issues.push({
        file: relativePath,
        type: 'theme-provider',
        line: getLineNumber(content, 'ThemeProvider')
      });
    }
  }
}

function getLineNumber(content, searchStr) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchStr)) {
      return i + 1;
    }
  }
  return null;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!shouldSkipFile(filePath)) {
        walkDirectory(filePath);
      }
    } else {
      checkFile(filePath);
    }
  });
}

// Main execution
console.log('🔍 CSS System Migration Check\n');
console.log('Scanning for deprecated imports and usage...\n');

walkDirectory(config.srcDir);

// Report results
console.log(`\n✅ Checked ${filesChecked} files`);
console.log(`📋 Found ${issuesFound} issues to migrate\n`);

if (issues.length > 0) {
  // Group issues by type
  const importIssues = issues.filter(i => i.type === 'import');
  const cssVarIssues = issues.filter(i => i.type === 'css-var');
  const themeHookIssues = issues.filter(i => i.type === 'theme-hook');
  const themeProviderIssues = issues.filter(i => i.type === 'theme-provider');
  
  if (importIssues.length > 0) {
    console.log('🔴 Deprecated Imports:');
    importIssues.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line || '?'}`);
      console.log(`    - "${issue.old}"`);
      if (issue.new) {
        console.log(`    + "${issue.new}"`);
      } else {
        console.log(`    ✖ Remove this import`);
      }
    });
    console.log('');
  }
  
  if (cssVarIssues.length > 0) {
    console.log('🔴 Deprecated CSS Variables:');
    cssVarIssues.forEach(issue => {
      console.log(`  ${issue.file}`);
      console.log(`    - "${issue.old}" (${issue.count} occurrences)`);
      console.log(`    + "${issue.new}"`);
    });
    console.log('');
  }
  
  if (themeHookIssues.length > 0) {
    console.log('🔴 Deprecated Theme Hooks:');
    themeHookIssues.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line || '?'}`);
      console.log(`    - Remove usage of "${issue.hook}"`);
      console.log(`    + Use CSS variables and data attributes instead`);
    });
    console.log('');
  }
  
  if (themeProviderIssues.length > 0) {
    console.log('🔴 ThemeProvider Usage:');
    themeProviderIssues.forEach(issue => {
      console.log(`  ${issue.file}:${issue.line || '?'}`);
      console.log(`    - Remove ThemeProvider wrapper`);
      console.log(`    + Theme is now handled via CSS`);
    });
    console.log('');
  }
  
  console.log('📚 Migration Resources:');
  console.log('  - Full guide: /docs/CSS_DEPRECATION_GUIDE.md');
  console.log('  - New architecture: /docs/CSS_ARCHITECTURE.md');
  console.log('  - Animation guide: /docs/ANIMATION_OPTIMIZATION_GUIDE.md');
  
  console.log('\n💡 To auto-fix some issues, you can run:');
  console.log('  npm run lint:fix');
  
} else {
  console.log('🎉 No deprecated CSS/theme usage found!');
  console.log('Your codebase is ready for the new CSS system.');
}

// Generate migration report
const reportPath = path.join(process.cwd(), 'css-migration-report.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  filesChecked,
  issuesFound,
  issues: issues.map(i => ({
    ...i,
    severity: i.type === 'theme-provider' ? 'high' : 'medium'
  }))
}, null, 2));

console.log(`\n📄 Detailed report saved to: ${reportPath}`);