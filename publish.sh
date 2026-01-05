#!/bin/bash

# Simple publish script for xmake-vscode extension
echo "🚀 Publishing extension $1..."
vsce publish $1
echo "✅ Published!"

# publish to open-vsx.org
# ovsx publish --pat <token>
