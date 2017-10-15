'use strict';

// imports
import * as vscode from 'vscode';

// get xmake tasks
async function getXMakeTasks(): Promise<vscode.Task[]> {

    // no root workspace?
    let emptyTasks: vscode.Task[] = [];
    let workspaceRoot = vscode.workspace.rootPath;    
    if (!workspaceRoot) {
        return emptyTasks;
    }

    // make tasks
    try {

        // init result
        const result: vscode.Task[] = [];

        // init build task
        let buildTask = new vscode.Task({ type: 'xmake'}, `Build`, 'XMake', new vscode.ProcessExecution("xmake"));
        buildTask.group = vscode.TaskGroup.Build;
        buildTask.presentationOptions = { echo: false };
        buildTask.problemMatchers = ["$xmake-gcc"];
        result.push(buildTask);

        // ok
        return Promise.resolve(result);

    } catch (e) {
        return Promise.resolve(emptyTasks);
    }
}

// the tasks class
export class Tasks implements vscode.Disposable {

    // the task provider
    private _provider: vscode.Disposable | undefined;

    // the constructor
    constructor() {

        // register task provider
        this._provider = vscode.workspace.registerTaskProvider('xmake', {
            provideTasks: () => {
                return getXMakeTasks();
            },
            resolveTask(_task: vscode.Task): vscode.Task | undefined {
                return undefined;
            }
        });
    }

    // dispose
    public dispose() {
        this._provider.dispose();
    }
}