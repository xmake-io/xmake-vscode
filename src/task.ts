'use strict';

// imports
import * as vscode from 'vscode';
import {log} from './log';

// TODO the xmake task provider class
export class XmakeTaskProvider implements vscode.TaskProvider {
	static XmakeType = 'xmake';

	constructor(workspaceRoot: string) {
	}

	public provideTasks(): Thenable<vscode.Task[]> | undefined {
		return undefined;
	}

	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
		return undefined;
	}
}