'use strict';

// imports
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import {log} from './log';
import {config} from './config';

// the terminal class
export class Terminal implements vscode.Disposable {

    // the terminal
    private _terminal: vscode.Terminal;

    // the logfile
    private _logfile: string;

    // the constructor
    constructor() {

        // init terminal
        this._terminal = vscode.window.createTerminal({name: "xmake"});
        this._terminal.hide();

        // enter the working directory
        if (vscode.workspace.rootPath !== config.workingDirectory) {
            this._terminal.sendText(`cd ${config.workingDirectory}`);
        }

        // enable logfile
        this._logfile = path.join(os.tmpdir(), ".xmake-vscode-build.log");
        if (os.platform() == "win32") {
            this._terminal.sendText(`set XMAKE_LOGFILE="${this._logfile}"`);
        } else {
            this._terminal.sendText(`export XMAKE_LOGFILE="${this._logfile}"`);
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
