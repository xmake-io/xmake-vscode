<div align="center">
  <a href="http://xmake.io">
    <img width="200" heigth="200" src="https://github.com/xmake-io/xmake-vscode/raw/master/res/logo256.png">
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
    <a href="https://github.com/xmake-io/xmake-vscode/blob/master/LICENSE.md">
      <img src="https://img.shields.io/github/license/tboox/xmake-vscode.svg?colorB=f48041&style=flat-square" alt="license" />
    </a>
    <a href="https://www.reddit.com/r/tboox/">
      <img src="https://img.shields.io/badge/chat-on%20reddit-ff3f34.svg?style=flat-square" alt="Reddit" />
    </a>
    <a href="https://gitter.im/tboox/tboox?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge">
      <img src="https://img.shields.io/gitter/room/tboox/tboox.svg?style=flat-square&colorB=96c312" alt="Gitter" />
    </a>
    <a href="https://t.me/tbooxorg">
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

You need install [xmake](https://github.com/xmake-io/xmake) first and a project with `xmake.lua`.

Please see [xmake-github](https://github.com/xmake-io/xmake) and [website](http://xmake.io) if you want to known more about xmake.

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

## IntelliSense

xmake-vscode will generate `.vscode/compile_commands.json` file, so you need only add it to `.vscode/c_cpp_properties.json` to enable IntelliSense.

for example (`.vscode/c_cpp_properties.json`):

```json
  "configurations": [
    {
      "compileCommands": ".vscode/compile_commands.json",
    }
  ],
}
```

### How can I generate c_cpp_properties.json?

These configuration settings are stored in your project's c_cpp_properties.json file. To edit this file, in VS Code, select C/C++: Edit Configurations (UI) from the Command Palette (⇧⌘P):

Please see [IntelliSense for cross-compiling](https://code.visualstudio.com/docs/cpp/configure-intellisense-crosscompilation)

![](https://code.visualstudio.com/assets/docs/cpp/cpp/command-palette.png)

## Debugging

Debug via launch configurations (launch.json) is accessible only with Run->Start Debugging (not F5 keybinding) or via Launch Debug command.

|attribute          |type  |         |
|-------------------|------|---------|
|**name**           |string| *Required.* Launch configuration name, as you want it to appear in the Run and Debug panel.
|**type**           |string| *Required.* Set to `xmake`.
|**request**        |string| *Required.* Session initiation method:`launch` or `attach`.
|**target**         |string| *Required.* XMake target.
|env                |object| 	Additional environment variables. `{"PATH" : "some/path"}`
|args               |string ❘ [string]| Command line parameters. If not defined args are taken from `debuggingTargetsArguments` config.
|cwd                |string| If not defined xmake will use the target directory.
|stopAtEntry        |boolean| If set to true, the debugger should stop at the entry-point of the target (ignored on attach). Default value is false.
|terminal           |string| Destination of stdio streams: <ul><li>`console` for Debug Console</li><li>`integrated` (default) for VSCode integrated terminal</li><li>`external` for a new terminal window</li><li>`newExternal` for a new terminal window but only with cli application (only cpptools / with lldb it will be converted to `external`)</li></ul>|

Example:

```json
{
    "configurations": [
    {
       "name": "XMake Debug",
        "type": "xmake",
        "request": "launch",
        "target": "example",
        "stopAtEntry": true
    }
  ]
}
```

### Envs behaviour

You can choose the behaviour between xmake envs and envs that are defined in `launch.json`
For an xmake envs that are like this `{"PATH: "path/from/xmake"}` and in `launch.json`
`{"PATH": "path/from/config}`.

* With `xmake.envBehaviour` set to `merge`, the result is `{"PATH": "path/from/xmake;path/from/config"}`.
* With `xmake.envBehaviour` set to `erase`, the result is `{"PATH": "path/from/xmake}`
* And with `xmake.envBehaviour` set to `override`, the result is: `{"PATH": "path/from/config}`.

XMake envs will only be replaced for the same key, if another xmake env key is present, it will be present in the final result.

## Global Configuration

We can configure them in settings.json

```json
{
    "configuration": {
        "type": "object",
        "title": "XMake configuration",
        "properties": {
            "xmake.executable": {
                "type": "string",
                "default": "xmake",
                "description": "The xmake executable name / path"
            },
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

