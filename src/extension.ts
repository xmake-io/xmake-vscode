'use strict';

// imports
import * as vscode from 'vscode';
import * as utils from './utils';
import * as process from './process';
import * as fs from 'fs';
import * as path from 'path';
import { XMake } from './xmake';
import { config } from './config';

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
        const slot = async (target) => {
            if (!utils.getProjectRoot()) {
                if (!!(await vscode.window.showErrorMessage('no opened folder!',
                    'Open a directory first!'))) {
                    vscode.commands.executeCommand('vscode.openFolder');
                }
                return;
            }


            // check xmake
            if (0 != (await process.runv(config.executable, ["--version"], { "COLORTERM": "nocolor" }, config.workingDirectory)).retval) {
                if (!!(await vscode.window.showErrorMessage('xmake not found!',
                    'Access https://xmake.io to download and install xmake first!'))) {
                }
                return;
            }

            // valid xmake project?
            switch (name) {
                case 'xmake.onCreateProject':
                    if (fs.existsSync(path.join(config.workingDirectory, "xmake.lua"))) {
                        if (!(await vscode.window.showErrorMessage('xmake.lua already exists!',
                            'continue'))) {
                            return;
                        }
                    }
                    break;
            
                default:
                    if (!fs.existsSync(path.join(config.workingDirectory, "xmake.lua"))) {
                        if (!!(await vscode.window.showErrorMessage('xmake.lua not found!',
                            'Create a new xmake project'))) {
                            await xmake.createProject();
                        }
                        return;
                    }
                    break;
            }

            fn(target);
        };

        return vscode.commands.registerCommand(name, slot);
    }
    for (const key of [
        'onCreateProject',
        'onNewFiles',
        'onForceConfigure',
        'onCleanConfigure',
        'onBuild',
        'onBuildAll',
        'onRebuild',
        'onClean',
        'onCleanAll',
        'onBuildRun',
        'onRun',
        'onPackage',
        'onInstall',
        'onUninstall',
        'onDebug',
        'onLaunchDebug',
        'onMacroBegin',
        'onMacroEnd',
        'onMacroRun',
        'onRunLastCommand',
        'onUpdateIntellisense',
        'setProjectRoot',
        'setTargetPlat',
        'setTargetArch',
        'setBuildMode',
        'setDefaultTarget',
        'setTarget',
        'setTargetToolchain'
    ]) {
        context.subscriptions.push(register('xmake.' + key, xmake[key]));
    }

    // start xmake plugin
    await xmake.start();
}

// this method is called when your extension is deactivated
export async function deactivate() {
}
