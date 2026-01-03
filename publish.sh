#!/bin/bash

# Simple publish script for xmake-vscode extension
echo "🚀 Publishing extension..."
vsce publish --no-yarn
echo "✅ Published!"
