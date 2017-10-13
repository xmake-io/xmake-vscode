'use strict';

// imports
import * as vscode from 'vscode';
import { XMake } from './xmake';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

    // this extension is activated!
    console.log('xmake-vscode: actived!');

    // init xmake plugin
    const xmake = new XMake(context);
    context.subscriptions.push(xmake);

    // register all commands of the xmake plugin
    function register(name, fn) {
        fn = fn.bind(xmake);
        return vscode.commands.registerCommand(name, _ => fn());
    }
    for (const key of [
        'onQuickStart',
        'onConfigure',
        'onCleanConfigure',
        'onBuild',
        'onRebuild',
        'onClean',
        'onCleanAll',
        'onRun',
        'onPackage', 
        'onInstall',
        'onUninstall',
        'onDebug',
        'onMacroBegin',
        'onMacroEnd',
        'onMacroRun',
        'onRunLastCommand',
        'setTargetPlat',
        'setTargetArch',
        'setBuildMode',
        'setDefaultTarget'
    ]) {
        context.subscriptions.push(register('xmake.' + key, xmake[key]));
    }

    // start xmake plugin
    await xmake.start();
}

// this method is called when your extension is deactivated
export async function deactivate() {
}
