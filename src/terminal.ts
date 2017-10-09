'use strict';

// imports
import * as vscode from 'vscode';
import * as proc from 'child_process';
import * as fs from 'fs';
import {log} from './log';
import {config} from './config';

// the terminal class
class Terminal {

    // the terminal
    private _terminal: vscode.Terminal;

    // the constructor
    constructor() {

        // init terminal
        this._terminal = vscode.window.createTerminal({name: "xmake"});
        this._terminal.show(false);

        // enter the working directory
        if (vscode.workspace.rootPath !== config.workingDirectory) {
            this._terminal.sendText(`cd ${config.workingDirectory}`);
        }
    }

    // execute command string
    public execute(command: string) {
        this._terminal.sendText(command);
        this._terminal.show(true);
    }
}

// the global terminal
export const terminal: Terminal = new Terminal();