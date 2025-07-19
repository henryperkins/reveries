#!/bin/bash

# Fix relative imports to use @ alias

echo "🔄 Fixing relative imports to use @ alias..."

# Counter for changes
total_changes=0

# Function to fix imports in a file
fix_imports() {
    local file=$1
    local temp_file="${file}.tmp"
    local changes=0
    
    # Create a copy and apply replacements
    cp "$file" "$temp_file"
    
    # Fix single-level relative imports
    sed -i "s/from ['\"]\.\.\/types['\"]/from '@\/types'/g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/services\//from '@\/services\//g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/hooks\//from '@\/hooks\//g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/components\//from '@\/components\//g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/researchGraph['\"]/from '@\/researchGraph'/g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/utils\//from '@\/utils\//g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/theme['\"]/from '@\/theme'/g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/theme\//from '@\/theme\//g" "$temp_file"
    
    # Fix two-level relative imports
    sed -i "s/from ['\"]\.\.\/\.\.\/types['\"]/from '@\/types'/g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/\.\.\/services\//from '@\/services\//g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/\.\.\/hooks\//from '@\/hooks\//g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/\.\.\/components\//from '@\/components\//g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/\.\.\/researchGraph['\"]/from '@\/researchGraph'/g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/\.\.\/utils\//from '@\/utils\//g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/\.\.\/theme['\"]/from '@\/theme'/g" "$temp_file"
    sed -i "s/from ['\"]\.\.\/\.\.\/theme\//from '@\/theme\//g" "$temp_file"
    
    # Check if file changed
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        echo "✅ Fixed imports in $file"
        ((total_changes++))
    else
        rm "$temp_file"
    fi
}

# Process all TypeScript and JavaScript files
export -f fix_imports
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    -not -path "*/node_modules/*" \
    -not -name "*.test.*" \
    -not -name "*.spec.*" | while read file; do
    fix_imports "$file"
done

echo ""
echo "📊 Summary:"
echo "Total files with imports fixed: $total_changes"
echo "✨ Import path cleanup complete!"