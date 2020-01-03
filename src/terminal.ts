'use strict';

// imports
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as utils from './utils';
import {log, LogLevel} from './log';
import {config} from './config';

// the terminal class
export class Terminal implements vscode.Disposable {

    // the logfile
    private _logfile: string;

    // the tasks
    private _tasks: vscode.Task[] = new Array();

    // the constructor
    constructor() {

        // init logfile
        this._logfile = path.join(config.workingDirectory, ".xmake", "vscode-build.log");

        // init the task callback
        vscode.tasks.onDidEndTask(async (e) => {
            
            // remove the finished task
            if (this._tasks.length > 0 && e.execution.task == this._tasks[0]) {
                this._tasks.shift();
            }

            // execute the next task
            if (this._tasks.length > 0) {
                let task = this._tasks[0];
                vscode.tasks.executeTask(task).then(function (execution) { 
                }, function (reason) {
                });
            }
        });
    }

    // dispose all objects
    public dispose() {
    }

    // get the log file
    public get logfile() {
        return this._logfile;
    }

    /* execute command string
     * @see https://code.visualstudio.com/api/extension-guides/task-provider
     */
    public async execute(name: string, command: string) {

        const options = {
            "cwd": config.workingDirectory,
            "env": {
                "XMAKE_LOGFILE": this.logfile
            }
        };
        const kind: vscode.TaskDefinition = {
            type: "xmake",
            script: "",
            path: "",
        };

        const execution = new vscode.ShellExecution(command, options);
        const task = new vscode.Task(kind, vscode.TaskScope.Workspace, "xmake: " + name, "xmake", execution, undefined);
        this._tasks.push(task);

        // only one task? execute it directly
        if (this._tasks.length == 1) {
            vscode.tasks.executeTask(task).then(function (execution) { 
            }, function (reason) {
            });
        }
    }
}
