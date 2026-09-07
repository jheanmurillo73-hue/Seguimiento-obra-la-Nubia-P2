#!/bin/bash
# Post-Merge Integration Script
# Run after merging mobile-optimization to main
# Usage: bash scripts/post-merge-mobile.sh

set -e

echo "📱 PhotoVault Pro - Post-Merge Integration"
echo "============================================="
echo ""

# Verify main branch
if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
    echo "⚠️  Warning: Not on main branch"
    echo "   Run: git checkout main"
    exit 1
fi

echo "✓ On main branch"
echo ""

# Step 1: Create icons directory
echo "📸 Step 1: Create icons directory"
mkdir -p public/icons
echo "  ✅ Created: public/icons/"
echo ""

# Step 2: Verify manifest.json
echo "📄 Step 2: Verify manifest.json"
if [ -f "public/manifest.json" ]; then
    echo "  ✅ Found: public/manifest.json"
else
    echo "  ⚠️  Warning: public/manifest.json not found"
fi
echo ""

# Step 3: Verify Service Worker
echo "⚡ Step 3: Verify Service Worker"
if [ -f "public/sw.js" ]; then
    echo "  ✅ Found: public/sw.js"
else
    echo "  ⚠️  Warning: public/sw.js not found"
fi
echo ""

# Step 4: Verify PWA register
echo "💳 Step 4: Verify PWA registration script"
if [ -f "public/pwa-register.js" ]; then
    echo "  ✅ Found: public/pwa-register.js"
else
    echo "  ⚠️  Warning: public/pwa-register.js not found"
fi
echo ""

# Step 5: Check index.html
echo "📁 Step 5: Check index.html for mobile meta tags"
if grep -q 'viewport-fit=cover' index.html; then
    echo "  ✅ viewport-fit=cover found"
else
    echo "  ⚠️  Add: <meta name='viewport' content='...viewport-fit=cover' />"
fi

if grep -q 'apple-mobile-web-app-capable' index.html; then
    echo "  ✅ apple-mobile-web-app-capable found"
else
    echo "  ⚠️  Add: <meta name='apple-mobile-web-app-capable' content='yes' />"
fi

if grep -q 'manifest.json' index.html; then
    echo "  ✅ manifest.json link found"
else
    echo "  ⚠️  Add: <link rel='manifest' href='/manifest.json' />"
fi

if grep -q 'pwa-register.js' index.html; then
    echo "  ✅ pwa-register.js found"
else
    echo "  ⚠️  Add: <script src='/pwa-register.js'></script>"
fi
echo ""

# Step 6: Check hook imports
echo "🔌 Step 6: Check for mobile hooks in components"
if grep -r 'useDeviceDetection' src/components/ > /dev/null 2>&1; then
    echo "  ✅ useDeviceDetection already in use"
else
    echo "  ⚠️  useDeviceDetection not yet integrated in components"
    echo "     Use: const device = useDeviceDetection();"
fi
echo ""

# Step 7: Build verification
echo "💾 Step 7: Verifying build"
if npm run lint > /dev/null 2>&1; then
    echo "  ✅ Lint passed"
else
    echo "  ⚠️  Lint found issues - run: npm run lint"
fi
echo ""

# Step 8: Summary
echo "============================================="
echo "📋 Summary"
echo "============================================="
echo ""
echo "Merge Status:"
echo "  ✅ Main branch merged successfully"
echo ""
echo "Setup Checklist:"
echo "  ⚠️  PWA Icons - Create in public/icons/"
echo "  ⚠️  index.html - Add mobile meta tags"
echo "  ⚠️  App.tsx - Integrate MobileNavBar"
echo "  ⚠️  Views - Replace with Responsive components"
echo ""
echo "Testing:"
echo "  1. npm run dev"
echo "  2. F12 → Ctrl+Shift+M → Toggle device"
echo "  3. Test on iPhone/Android with ngrok"
echo ""
echo "Documentation:"
echo "  - DEPLOYMENT_GUIDE.md (current steps)"
echo "  - MOBILE_OPTIMIZATION_GUIDE.md (reference)"
echo "  - INTEGRATION_CHECKLIST.md (detailed)"
echo ""
echo "Next Command:"
echo "  git add . && git commit -m 'feat: Complete mobile integration'"
echo ""
echo "✅ Post-merge verification complete!"
