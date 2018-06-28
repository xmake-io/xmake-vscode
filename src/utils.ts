'use strict';

// imports
import * as vscode from 'vscode';
import * as path from 'path';

// get project root directory
var projectRoot = null;
export function setProjectRoot(root: string) {
    projectRoot = root;
}
export function getProjectRoot(): string {
    if (projectRoot == null && 
        vscode.workspace.workspaceFolders &&vscode.workspace.workspaceFolders.length > 0) {
        projectRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    return projectRoot;
}

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
        ['${workspaceRoot}', getProjectRoot()],
        ['${workspaceRootFolderName}', path.basename(getProjectRoot() || '.')]
    ] as [string, string][];

    // replace all variables
    return replacements.reduce((accdir, [needle, what]) => replaceAll(accdir, needle, what), str);
}

// sleep some times
export const sleep = ms => new Promise(res => setTimeout(res, ms));
