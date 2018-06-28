'use strict';

// imports
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as utils from './utils';
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

        // enter the project root directory
        this.enterProjectRoot(false);
    }

    // enter the project root directory
    public enterProjectRoot(force: boolean) {
    
        // enter the working directory
        if (force || utils.getProjectRoot() !== config.workingDirectory) {
            this._terminal.sendText(`cd ${config.workingDirectory}`);
        }

        // enable logfile
        this._logfile = path.join(config.workingDirectory, ".xmake", "vscode-build.log");
        if (os.platform() == "win32") {
            switch (this.shellKind) {
                case "powershell":
                    this._terminal.sendText(`$env:XMAKE_LOGFILE="${this._logfile}"`);
                    break;
                case "cmd":
                    this._terminal.sendText(`set XMAKE_LOGFILE="${this._logfile}"`);
                    break;
                case "bash":
                    this._terminal.sendText(`export XMAKE_LOGFILE="${this._logfile}"`);
                    break;
            }
        } else {
            this._terminal.sendText(`export XMAKE_LOGFILE="${this._logfile}"`);
        }
    }

    // dispose all objects
    public dispose() {
        this._terminal.dispose();
    }

    // get the log file
    public get logfile() {
        return this._logfile;
    }

    // execute command string
    public execute(command: string) {
        this._terminal.sendText(command); 
        this._terminal.show(true);
    }

    // get shell kind
    get shellKind(): string {
    
        // only get shell kind on windows
        if (os.platform() !== 'win32') {
            return "";
        }

        // get terminal settings
        let terminalSettings = vscode.workspace.getConfiguration('terminal')

        // get windows shell path
        var windowsShellPath = terminalSettings.integrated.shell.windows;
        if (!windowsShellPath) {
            return "";
        }

        // is powershell?
        windowsShellPath = windowsShellPath.toLowerCase()
        if (windowsShellPath.indexOf("powershell.exe") != -1) {
            return "powershell";
        }

        // is cmd?
        if (windowsShellPath.indexOf("cmd.exe") != -1) {
            return "cmd";
        }

        // is bash?
        if (windowsShellPath.indexOf("bash.exe") != -1) {
            return "bash";
        }

        // not found!
        return ""
    }
}
