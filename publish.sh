#!/bin/bash

# Simple publish script for xmake-vscode extension
VERSION=${1:-""}

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 2.4.2"
    exit 1
fi

echo "🚀 Publishing extension $VERSION..."

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Git working directory not clean. Please commit or stash changes first."
    git status
    exit 1
fi

# Update package.json version directly
echo "📝 Updating package.json version to $VERSION..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# Publish the extension
echo "📤 Publishing extension as version $VERSION..."
vsce publish $VERSION

# Create and push git tag
echo "🏷️  Creating git tag v$VERSION..."
git add package.json
git commit -m "Bump version to $VERSION"
git tag v$VERSION
git push origin v$VERSION

echo "✅ Extension published successfully as version $VERSION!"
echo "🔗 Tag pushed: v$VERSION"

