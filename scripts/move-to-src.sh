#!/bin/bash

# Move implementation files from root to src
echo "Moving implementation files to src directory..."

# Move components
if [ -d "components" ] && [ "$(ls -A components/*.tsx 2>/dev/null)" ]; then
  echo "Moving components..."
  mkdir -p src/components
  mv components/*.tsx src/components/ 2>/dev/null || true
  mv components/*.css src/components/ 2>/dev/null || true
fi

# Move services
if [ -d "services" ] && [ "$(ls -A services/*.ts 2>/dev/null)" ]; then
  echo "Moving services..."
  mkdir -p src/services
  mv services/*.ts src/services/ 2>/dev/null || true
  # Move context layers subdirectory if it exists
  if [ -d "services/contextLayers" ]; then
    mv services/contextLayers src/services/
  fi
fi

# Move hooks
if [ -d "hooks" ] && [ "$(ls -A hooks/*.ts 2>/dev/null)" ]; then
  echo "Moving hooks..."
  mkdir -p src/hooks
  mv hooks/*.ts src/hooks/ 2>/dev/null || true
fi

# Move utils
if [ -d "utils" ] && [ "$(ls -A utils/*.ts 2>/dev/null)" ]; then
  echo "Moving utils..."
  mkdir -p src/utils
  mv utils/*.ts src/utils/ 2>/dev/null || true
fi

# Move core files
echo "Moving core files..."
[ -f "types.ts" ] && mv types.ts src/
[ -f "constants.ts" ] && mv constants.ts src/
[ -f "researchGraph.ts" ] && mv researchGraph.ts src/
[ -f "App.css" ] && mv App.css src/
[ -f "index.css" ] && mv index.css src/

# Clean up empty directories
rmdir components services hooks utils 2>/dev/null || true

echo "Migration complete!"
echo "Next steps:"
echo "1. Run 'npm install' to install missing types"
echo "2. Run 'npm run typecheck' to verify type safety"
echo "3. Update remaining imports to use @/ alias"
