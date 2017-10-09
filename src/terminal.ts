'use strict';

// imports
import * as vscode from 'vscode';
import {log} from './log';
import {config} from './config';

// the terminal class
export class Terminal implements vscode.Disposable {

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

    // dispose all objects
    public dispose() {
        this._terminal.dispose();
    }

    // execute command string
    public execute(command: string) {
        this._terminal.sendText(command);
        this._terminal.show(true);
    }
}
