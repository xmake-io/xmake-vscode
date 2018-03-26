<div align="center">
  <a href="http://xmake.io">
    <img width="200" heigth="200" src="https://github.com/tboox/xmake-vscode/raw/master/res/logo256.png">
  </a>  

  <h1>xmake-vscode</h1>

  <div>
    <a href="https://marketplace.visualstudio.com/items?itemName=tboox.xmake-vscode#overview">
      <img src="https://img.shields.io/vscode-marketplace/v/tboox.xmake-vscode.svg?style=flat-square" alt="Version" />
    </a>
    <a href="https://marketplace.visualstudio.com/items?itemName=tboox.xmake-vscode#overview">
      <img src="https://img.shields.io/vscode-marketplace/d/tboox.xmake-vscode.svg?style=flat-square" alt="Downloads" />
    </a>
    <a href="https://marketplace.visualstudio.com/items?itemName=tboox.xmake-vscode#review-details">
      <img src="https://img.shields.io/vscode-marketplace/r/tboox.xmake-vscode.svg?style=flat-square" alt="Rating&Review" />
    </a>
  </div>
  <div>
    <a href="https://github.com/tboox/xmake-vscode/blob/master/LICENSE.md">
      <img src="https://img.shields.io/github/license/tboox/xmake-vscode.svg?colorB=f48041&style=flat-square" alt="license" />
    </a>
    <a href="https://www.reddit.com/r/tboox/">
      <img src="https://img.shields.io/badge/chat-on%20reddit-ff3f34.svg?style=flat-square" alt="Reddit" />
    </a>
    <a href="https://gitter.im/tboox/tboox?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge">
      <img src="https://img.shields.io/gitter/room/tboox/tboox.svg?style=flat-square&colorB=96c312" alt="Gitter" />
    </a>
    <a href="https://t.me/joinchat/F2dIAw5iTkDUMwCQ_8CStw">
      <img src="https://img.shields.io/badge/chat-on%20telegram-blue.svg?style=flat-square" alt="Telegram" />
    </a>
    <a href="https://jq.qq.com/?_wv=1027&k=5hpwWFv">
      <img src="https://img.shields.io/badge/chat-on%20QQ-ff69b4.svg?style=flat-square" alt="QQ" />
    </a>
    <a href="http://xmake.io/pages/donation.html#donate">
      <img src="https://img.shields.io/badge/donate-us-orange.svg?style=flat-square" alt="Donate" />
    </a>
  </div>

  <p>A XMake integration in Visual Studio Code</p>
</div>

## Introduction 

A XMake integration in Visual Studio Code. 

You need install [xmake](https://github.com/tboox/xmake) first and a project with `xmake.lua`.

Please see [xmake-github](https://github.com/tboox/xmake) and [website](http://xmake.io) if you want to known more about xmake.

## Features

* Quickstart
* Colorization
* Completion Lists
* StatusBar
* Commands
* Configuration
* Build
* Run and Debug
* Record and Playback
* Problem

## Quickstart

<img src="https://raw.githubusercontent.com/tboox/xmake-vscode/master/res/quickstart.gif" width="60%" />

## Colorization and Completion Lists

<img src="https://raw.githubusercontent.com/tboox/xmake-vscode/master/res/completion.gif" width="60%" />

## StatusBar

![statusbar](https://raw.githubusercontent.com/tboox/xmake-vscode/master/res/statusbar.png)
 
## Commands

<img src="https://raw.githubusercontent.com/tboox/xmake-vscode/master/res/commands.png" width="60%" />
 
## Configuration

<img src="https://raw.githubusercontent.com/tboox/xmake-vscode/master/res/configure.gif" width="60%" />
 
## Build

<img src="https://raw.githubusercontent.com/tboox/xmake-vscode/master/res/build.gif" width="60%" />
  
## Run and Debug

<img src="https://raw.githubusercontent.com/tboox/xmake-vscode/master/res/debug.gif" width="60%" />
 
## Record and Playback

<img src="https://raw.githubusercontent.com/tboox/xmake-vscode/master/res/record.gif" width="60%" />

## Problem

<img src="https://raw.githubusercontent.com/tboox/xmake-vscode/master/res/problem.gif" width="60%" />

## Global Configuration

```json
{
    "configuration": {
        "type": "object",
        "title": "XMake configuration",
        "properties": {
            "xmake.logLevel": {
                "type": "string",
                "default": "normal",
                "description": "The Log Level: normal/verbose/minimal",
                "enum": [
                    "verbose",
                    "normal",
                    "minimal"
                ]
            },
            "xmake.buildLevel": {
                "type": "string",
                "default": "normal",
                "description": "The Build Output Level: normal/verbose/warning/debug",
                "enum": [
                    "verbose",
                    "normal",
                    "warning",
                    "debug"
                ]
            },
            "xmake.buildDirectory": {
                "type": "string",
                "default": "${workspaceRoot}/build",
                "description": "The Build Output Directory"
            },
            "xmake.installDirectory": {
                "type": "string",
                "default": "",
                "description": "The Install Output Directory"
            },
            "xmake.packageDirectory": {
                "type": "string",
                "default": "",
                "description": "The Package Output Directory"
            },
            "xmake.workingDirectory": {
                "type": "string",
                "default": "${workspaceRoot}",
                "description": "The Project Working Directory with the root xmake.lua"
            },
            "xmake.androidNDKDirectory": {
                "type": "string",
                "default": "",
                "description": "The Android NDK Directory"
            }
        }
    }
}
```
 
