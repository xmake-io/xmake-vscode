'use strict';

// imports
import * as vscode from 'vscode';
import * as utils from './utils';
import * as process from './process';
import * as fs from 'fs';
import * as path from 'path';
import { XMake } from './xmake';
import { config } from './config';
import { XMakeTestCodeLensProvider } from './testCodeLensProvider';
import { discoverTests, disposeTestController, refreshTests, runTest, debugTest } from './testRunner';

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
                
                case 'xmake.onShowExplorer':
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
        'onShowExplorer',
        'onTest',
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

    // register test-related commands
    context.subscriptions.push(
        vscode.commands.registerCommand('xmake.refreshTests', async () => {
            await refreshTests();
        }),
        vscode.commands.registerCommand('xmake.testRunFromCodeLens', async (args: { testName: string; sourceFile: string }) => {
            await runTest(args.testName, args.sourceFile);
        }),
        vscode.commands.registerCommand('xmake.testDebugFromCodeLens', async (args: { testName: string; sourceFile: string }) => {
            await debugTest(args.testName, args.sourceFile);
        })
    );

    // register CodeLens provider for test integration
    const codeLensProvider = new XMakeTestCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            [
                { language: 'cpp', scheme: 'file' },
                { language: 'c', scheme: 'file' },
                { language: 'hpp', scheme: 'file' },
                { language: 'h', scheme: 'file' }
            ],
            codeLensProvider
        )
    );

    // discover tests on startup if test explorer is enabled
    const testExplorerEnabled = config.get<boolean>('testExplorerIntegrationEnabled');
    if (testExplorerEnabled !== false) {
        // Wait a bit for the project to load, then discover tests
        setTimeout(async () => {
            await discoverTests();
        }, 2000);
    }

    // watch for xmake.lua changes to refresh tests
    const workspaceRoot = config.workingDirectory;
    const xmakeLuaWatcher = vscode.workspace.createFileSystemWatcher(
        workspaceRoot
            ? new vscode.RelativePattern(workspaceRoot, 'xmake.lua')
            : '**/xmake.lua'
    );
    xmakeLuaWatcher.onDidChange(async () => {
        const enabled = config.get<boolean>('testExplorerIntegrationEnabled');
        if (enabled !== false) {
            await refreshTests();
        }
    });
    context.subscriptions.push(xmakeLuaWatcher);

    // start xmake plugin
    await xmake.start();
}

// this method is called when your extension is deactivated
export async function deactivate() {
    disposeTestController();
}
