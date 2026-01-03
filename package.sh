#!/bin/bash

# Simple package script for xmake-vscode extension
echo "📦 Packaging extension..."
vsce package --no-yarn
echo "✅ Done!"
