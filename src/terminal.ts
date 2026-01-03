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
            if (this._tasks.length > 0) {
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

    /* execute command string and return execution result
     * @see https://code.visualstudio.com/api/extension-guides/task-provider
     */
    public async exec(name: string, command: string, withlog: boolean = true): Promise<number> {

        var options = {"cwd": config.workingDirectory};
        if (withlog) {
            options["env"] = {XMAKE_LOGFILE: this.logfile};
        }

        const kind: vscode.TaskDefinition = {
            type: "xmake",
            script: "",
            path: "",
        };

        const execution = new vscode.ShellExecution(command, options);
        const task = new vscode.Task(kind, vscode.TaskScope.Workspace, "xmake: " + name, "xmake", execution, undefined);
        
        return this.executeTask(task);
    }

    /* execute command with arguments list and return execution result
     * @see https://code.visualstudio.com/api/extension-guides/task-provider
     */
    public async execv(name: string, command: string, args: string[], withlog: boolean = true): Promise<number> {

        var options = {"cwd": config.workingDirectory};
        if (withlog) {
            options["env"] = {XMAKE_LOGFILE: this.logfile};
        }

        const kind: vscode.TaskDefinition = {
            type: "xmake",
            script: "",
            path: "",
        };

        const execution = new vscode.ShellExecution(command, args, options);
        const task = new vscode.Task(kind, vscode.TaskScope.Workspace, "xmake: " + name, "xmake", execution, undefined);
        
        return this.executeTask(task);
    }

    /* execute a task and return its exit code
     * this method handles task queuing and promise resolution properly
     */
    private async executeTask(task: vscode.Task): Promise<number> {
        this._tasks.push(task);
        
        const self = this; // preserve context
        
        return new Promise<number>((resolve) => {
            vscode.tasks.executeTask(task).then(function (execution) {
                // listen for task completion
                const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
                    if (e.execution === execution) {
                        disposable.dispose();
                        // remove task from queue
                        const index = self._tasks.indexOf(task);
                        if (index > -1) {
                            self._tasks.splice(index, 1);
                        }
                        resolve(e.exitCode ?? 0);
                    }
                });
            }, function (reason) {
                // remove task from queue on failure
                const index = self._tasks.indexOf(task);
                if (index > -1) {
                    self._tasks.splice(index, 1);
                }
                resolve(-1); // execution failed
            });
        });
    }
}
