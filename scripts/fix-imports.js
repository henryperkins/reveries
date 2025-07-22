#!/usr/bin/env node

const fs = require('fs');
const glob = require('glob');

// Define the mappings for imports to fix
const importMappings = [
  { from: /from ['"]\.\.\/types['"]/, to: "from '@/types'" },
  { from: /from ['"]\.\.\/services\//, to: "from '@/services/" },
  { from: /from ['"]\.\.\/hooks\//, to: "from '@/hooks/" },
  { from: /from ['"]\.\.\/components\//, to: "from '@/components/" },
  { from: /from ['"]\.\.\/researchGraph['"]/, to: "from '@/researchGraph'" },
  { from: /from ['"]\.\.\/utils\//, to: "from '@/utils/" },
  { from: /from ['"]\.\.\/theme['"]/, to: "from '@/theme'" },
  { from: /from ['"]\.\.\/theme\//, to: "from '@/theme/" },
  
  // Two levels up
  { from: /from ['"]\.\.\/\.\.\/types['"]/, to: "from '@/types'" },
  { from: /from ['"]\.\.\/\.\.\/services\//, to: "from '@/services/" },
  { from: /from ['"]\.\.\/\.\.\/hooks\//, to: "from '@/hooks/" },
  { from: /from ['"]\.\.\/\.\.\/components\//, to: "from '@/components/" },
  { from: /from ['"]\.\.\/\.\.\/researchGraph['"]/, to: "from '@/researchGraph'" },
  { from: /from ['"]\.\.\/\.\.\/utils\//, to: "from '@/utils/" },
  { from: /from ['"]\.\.\/\.\.\/theme['"]/, to: "from '@/theme'" },
  { from: /from ['"]\.\.\/\.\.\/theme\//, to: "from '@/theme/" },
];

// Find all TypeScript and JavaScript files in src directory
const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
  ignore: ['src/**/*.test.{ts,tsx,js,jsx}', 'src/**/*.spec.{ts,tsx,js,jsx}']
});

let totalChanges = 0;
const changedFiles = [];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let fileChanges = 0;

  // Apply all import mappings
  importMappings.forEach(mapping => {
    const matches = content.match(mapping.from);
    if (matches) {
      content = content.replace(mapping.from, mapping.to);
      fileChanges++;
    }
  });

  // If content changed, write it back
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles.push({ file, changes: fileChanges });
    totalChanges += fileChanges;
    console.log(`✅ Fixed ${fileChanges} imports in ${file}`);
  }
});

console.log('\n📊 Summary:');
console.log(`Total files processed: ${files.length}`);
console.log(`Files changed: ${changedFiles.length}`);
console.log(`Total imports fixed: ${totalChanges}`);

if (changedFiles.length > 0) {
  console.log('\n📝 Changed files:');
  changedFiles.forEach(({ file, changes }) => {
    console.log(`  - ${file} (${changes} changes)`);
  });
}