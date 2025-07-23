# Debug Instructions for Missing UI Elements

## Immediate Troubleshooting Steps

1. **Check Browser Console**: Open DevTools (F12) and check for JavaScript errors
2. **Verify CSS Loading**: Check Network tab for 404 errors on CSS files
3. **Test with Debug Mode**: Add `?debug=1` to URL to enable debug styling

## Quick Fixes to Try

### 1. Force Component Visibility
The components are likely rendered but hidden. Add these classes to body:
```html
<body class="force-visible">
```

### 2. Check Color Contrast
The theme uses subtle colors that may appear white:
- Background: `--colors-westworld-cream: #FAF6F2`
- Text: `--colors-westworld-near-black: #2A2522`
- Primary: `--colors-westworld-gold: #D4AF37`

### 3. Verify Component Structure
All components exist in the codebase:
- ✅ `TopNavigation` - src/components/TopNavigation.tsx
- ✅ `ProgressMeter` - src/components/atoms/ProgressMeter.tsx
- ✅ `ResearchView` - src/components/ResearchView.tsx
- ✅ `Controls` - src/components/Controls.tsx
- ✅ `FunctionCallDock` - src/components/FunctionCallDock/index.tsx

### 4. Check Z-Index Issues
Components may be behind other elements. Test by:
- Inspecting element hierarchy
- Checking z-index values in DevTools
- Looking for `position: fixed` elements

### 5. JavaScript Execution Issues
Check if:
- React is mounting to DOM
- console.log statements show in DevTools
- No React errors in console

## Server Status
✅ Server running on http://localhost:5173
✅ TypeScript compilation successful
✅ Build process working
✅ All components imported correctly

## Browser Testing
Test in different browsers and with DevTools open to identify rendering issues.
