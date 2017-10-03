'use strict';

// imports
import * as vscode from 'vscode';
import * as path from 'path';

// replace all
export function replaceAll(str: string, needle: string, what: string) {
    const pattern = needle.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
    const re = new RegExp(pattern, 'g');
    return str.replace(re, what);
  }

// replace variables
export function replaceVars(str: string): string {
    
    // init replacements
    const replacements = [
        ['${workspaceRoot}', vscode.workspace.rootPath],
        ['${workspaceRootFolderName}', path.basename(vscode.workspace.rootPath || '.')]
    ] as [string, string][];

    // replace all variables
    return replacements.reduce((accdir, [needle, what]) => replaceAll(accdir, needle, what), str);
}