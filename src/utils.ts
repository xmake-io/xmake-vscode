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

// get assets script path
export function getAssetsScriptPath(scriptName: string): string {
    // In development mode (running from source), __dirname points to src/
    // In compiled extension (running from out), __dirname points to out/
    // So we need to handle both cases
    if (__dirname.endsWith('src')) {
        // Development mode: go up two levels from src/
        return path.resolve(__dirname, "..", "..", "assets", scriptName);
    } else {
        // Compiled mode: go up one level from out/
        return path.resolve(__dirname, "..", "assets", scriptName);
    }
}

// get res directory path
export function getResourcePath(resourceName: string = ""): string {
    // In development mode (running from source), __dirname points to src/
    // In compiled extension (running from out), __dirname points to out/
    // So we need to handle both cases
    if (__dirname.endsWith('src')) {
        // Development mode: go up two levels from src/
        return path.resolve(__dirname, "..", "..", "res", resourceName);
    } else {
        // Compiled mode: go up one level from out/
        return path.resolve(__dirname, "..", "res", resourceName);
    }
}

// get template directory path
export function getTemplatePath(templateName: string = ""): string {
    // In development mode (running from source), __dirname points to src/
    // In compiled extension (running from out), __dirname points to out/
    // So we need to handle both cases
    if (__dirname.endsWith('src')) {
        // Development mode: go up two levels from src/
        return path.resolve(__dirname, "..", "..", "assets", "newfiles", templateName);
    } else {
        // Compiled mode: go up one level from out/
        return path.resolve(__dirname, "..", "assets", "newfiles", templateName);
    }
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

// simplistic function for just checking if a string can be parsed as json
export function isJson(text?: string): boolean {
    try {
        JSON.parse(text);
    } catch(e) {
        return false;
    }
    return true;
}

// sleep some times
export const sleep = ms => new Promise(res => setTimeout(res, ms));
