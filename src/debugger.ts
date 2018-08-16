'use strict';

// imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as encoding from 'encoding';
import {log} from './log';
import {config} from './config';

// the debugger class
export class Debugger implements vscode.Disposable {

    // the diagnostic collection
    private _diagnosticCollection: vscode.DiagnosticCollection;

    // the constructor
    constructor() {
    }

    // dispose
    public dispose() {
    }

    // startDebugging
    async startDebugging(targetName?: string, targetProgram?: string) {

        // no target program?
        if (!targetProgram) {
            return ;
        }

        // no target name? get it from target program
        if (!targetName) {
            targetName = path.basename(targetProgram);
        }
        
        // init debug configuration
        var debugConfig: vscode.DebugConfiguration = null
        if (os.platform() == "darwin") {
            debugConfig = {
                name: `launch: ${targetName}`,
                type: 'cppdbg',
                request: 'launch',
                program: targetProgram,
                args: config.additionalDebuggerTargetArguments,
                stopAtEntry: true,
                cwd: path.dirname(targetProgram),
                environment: [],
                externalConsole: true,
                MIMode: "lldb",
                miDebuggerPath: ""
            };
        } else if (os.platform() == "linux") {
            debugConfig = {
                name: `launch: ${targetName}`,
                type: 'cppdbg',
                request: 'launch',
                program: targetProgram,
                args: config.additionalDebuggerTargetArguments,
                stopAtEntry: true,
                cwd: path.dirname(targetProgram),
                environment: [],
                externalConsole: true,
                MIMode: "gdb",
                miDebuggerPath: "",
                description: "Enable pretty-printing for gdb",
                text: "-enable-pretty-printing",
                ignoreFailures: true
            };
        } else if (os.platform() == "win32") {
            debugConfig = {
                name: `launch: ${targetName}`,
                type: 'cppvsdbg',
                request: 'launch',
                program: targetProgram,
                args: [],
                stopAtEntry: true,
                cwd: path.dirname(targetProgram),
                environment: [],
                externalConsole: true,
                MIMode: "gdb",
                miDebuggerPath: "",
                description: "Enable pretty-printing for gdb",
                text: "-enable-pretty-printing",
                ignoreFailures: true
            };
        }

        // start debugging
        if (debugConfig) {
            await vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], debugConfig);
        }
    }
}