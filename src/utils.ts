'use strict';

// imports
import * as vscode from 'vscode';
import * as path from 'path';
import * as iconv from 'iconv-lite';

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

export function decodeBufferWithConfidence(buffer: Buffer): { encoding: string; text: string } {
    const isUtf8Bom = (value: Buffer) => value.length >= 3 && value[0] === 0xEF && value[1] === 0xBB && value[2] === 0xBF;
    const isUtf16LeBom = (value: Buffer) => value.length >= 2 && value[0] === 0xFF && value[1] === 0xFE;
    const isUtf16BeBom = (value: Buffer) => value.length >= 2 && value[0] === 0xFE && value[1] === 0xFF;

    if (isUtf8Bom(buffer)) {
        return { encoding: 'utf8-bom', text: buffer.subarray(3).toString('utf8') };
    }
    if (isUtf16LeBom(buffer)) {
        return { encoding: 'utf16le-bom', text: iconv.decode(buffer.subarray(2), 'utf16le') };
    }
    if (isUtf16BeBom(buffer)) {
        return { encoding: 'utf16be-bom', text: iconv.decode(buffer.subarray(2), 'utf16be') };
    }

    const utf8Text = buffer.toString('utf8');
    if (Buffer.from(utf8Text, 'utf8').equals(buffer)) {
        return { encoding: 'utf8', text: utf8Text };
    }

    const gbkText = iconv.decode(buffer, 'gbk');
    if (iconv.encode(gbkText, 'gbk').equals(buffer)) {
        return { encoding: 'gbk', text: gbkText };
    }

    const utf8ReplacementCount = (utf8Text.match(/\uFFFD/g) || []).length;
    const gbkReplacementCount = (gbkText.match(/\uFFFD/g) || []).length;
    if (gbkReplacementCount < utf8ReplacementCount) {
        return { encoding: 'gbk-fallback', text: gbkText };
    }

    return { encoding: 'utf8-fallback', text: utf8Text };
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
