#!/bin/bash
# Setup script for mobile optimization
# Run: bash scripts/setup-mobile.sh

set -e

echo "📱 PhotoVault Pro - Mobile Optimization Setup"
echo "============================================="
echo ""

# Check Node version
echo "✓ Checking Node version..."
node_version=$(node -v)
echo "  Node: $node_version"
echo ""

# Create directories
echo "✓ Creating necessary directories..."
mkdir -p public/icons
mkdir -p public/screenshots
mkdir -p src/components/MobileOptimized
mkdir -p src/hooks
echo "  Directories created"
echo ""

# Check if manifest exists
if [ ! -f "public/manifest.json" ]; then
    echo "⚠️  Warning: manifest.json not found in public/"
    echo "   This file was added to the mobile-optimization branch"
    echo "   Please merge the branch or copy the file manually"
else
    echo "✓ manifest.json found"
fi

if [ ! -f "public/sw.js" ]; then
    echo "⚠️  Warning: sw.js (Service Worker) not found"
    echo "   This file was added to the mobile-optimization branch"
else
    echo "✓ sw.js found"
fi

echo ""
echo "✓ Dependencies to install (optional):"
echo "  npm install vite-plugin-pwa  # For PWA optimization"
echo ""

# Create sample icons placeholder
echo "✓ Creating icon placeholders..."
for size in 192 512; do
    for variant in "" "-maskable"; do
        icon_file="public/icons/icon-${size}${variant}.png"
        if [ ! -f "$icon_file" ]; then
            echo "  ⚠️  Missing: icon-${size}${variant}.png"
        fi
    done
done
echo ""

echo "✓ Checking index.html for mobile meta tags..."
if grep -q 'viewport-fit=cover' index.html; then
    echo "  ✅ viewport-fit=cover found"
else
    echo "  ⚠️  viewport-fit=cover not found - add to <meta name='viewport'>"
fi

if grep -q 'manifest.json' index.html; then
    echo "  ✅ manifest.json link found"
else
    echo "  ⚠️  manifest.json link not found - add: <link rel='manifest' href='/manifest.json'>"
fi

echo ""
echo "============================================="
echo "📋 Next Steps:"
echo "============================================="
echo ""
echo "1. Create PWA Icons:"
echo "   - Visit: https://www.pwabuilder.com/imageGenerator"
echo "   - Upload a 512x512 logo"
echo "   - Save icons to public/icons/"
echo ""
echo "2. Update index.html:"
echo "   - Add viewport-fit=cover"
echo "   - Add manifest link"
echo "   - Add pwa-register.js script"
echo ""
echo "3. Test on Mobile:"
echo "   npm run dev"
echo "   # In another terminal:"
echo "   ngrok http 3000"
echo "   # Open ngrok URL on iPhone/Android"
echo ""
echo "4. Review Documentation:"
echo "   - Read: MOBILE_OPTIMIZATION_GUIDE.md"
echo "   - Follow: INTEGRATION_CHECKLIST.md"
echo ""
echo "============================================="
echo "✅ Setup complete!"
echo "============================================="
