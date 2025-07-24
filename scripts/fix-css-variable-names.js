#!/usr/bin/env node

/**
 * Script to fix CSS variable naming inconsistencies
 * Converts incorrect prefixes to the standardized format
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Mapping of incorrect prefixes to correct ones
const prefixMappings = {
  // Colors
  '--colors-': '--color-',
  '--paradigm-': '--color-paradigm-',
  
  // Border radius
  '--border-radius-': '--radius-',
  
  // Shadows
  '--shadows-': '--shadow-',
  
  // Animations
  '--animation-': '--color-animation-',
  '--animate-': '--animation-',
};

// Files to process
const cssFiles = glob.sync('src/**/*.css', { 
  ignore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ]
});

console.log(`Found ${cssFiles.length} CSS files to process`);

let totalReplacements = 0;

cssFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let replacements = 0;
  
  // Replace each incorrect prefix
  Object.entries(prefixMappings).forEach(([oldPrefix, newPrefix]) => {
    const regex = new RegExp(escapeRegex(oldPrefix), 'g');
    const matches = content.match(regex);
    
    if (matches) {
      replacements += matches.length;
      content = content.replace(regex, newPrefix);
    }
  });
  
  if (replacements > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${replacements} variables in ${path.relative(process.cwd(), filePath)}`);
    totalReplacements += replacements;
  }
});

console.log(`\n✨ Total replacements: ${totalReplacements}`);

// Also update Tailwind config references
const tailwindFiles = [
  'tailwind.config.js',
  'tailwind.config.unified.js'
];

tailwindFiles.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let replacements = 0;
    
    // Update variable references in Tailwind config
    const varReplacements = {
      'var(--colors-': 'var(--color-',
      'var(--border-radius-': 'var(--radius-',
      'var(--shadows-': 'var(--shadow-',
      'var(--paradigm-': 'var(--color-paradigm-',
    };
    
    Object.entries(varReplacements).forEach(([oldVar, newVar]) => {
      const regex = new RegExp(escapeRegex(oldVar), 'g');
      const matches = content.match(regex);
      
      if (matches) {
        replacements += matches.length;
        content = content.replace(regex, newVar);
      }
    });
    
    if (replacements > 0) {
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed ${replacements} references in ${file}`);
    }
  }
});

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

console.log('\n🎉 CSS variable naming fix complete!');
console.log('\nNext steps:');
console.log('1. Run `npm run lint:css` to verify the changes');
console.log('2. Test the application to ensure styles work correctly');
console.log('3. Update any TypeScript interfaces that reference these variables');