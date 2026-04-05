'use strict';

// imports
import * as vscode from 'vscode';
import * as utils from './utils';
import * as process from './process';
import * as fs from 'fs';
import * as path from 'path';
import { XMake } from './xmake';
import { config } from './config';

function isXmakeLua(filePath: string): boolean {
  return path.basename(filePath).toLowerCase() === 'xmake.lua';
}

function shouldSwitchProjectRoot(detectedRoot: string): boolean {
  const currentRoot = utils.getProjectRoot();
  if (!currentRoot) {
    return true;
  }
  return currentRoot !== detectedRoot;
}

function tryDetectProjectRootFromDocument(document?: vscode.TextDocument): boolean {
  if (!document || document.isUntitled || !isXmakeLua(document.fileName)) {
    return false;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    return false;
  }

  const detectedRoot = path.dirname(document.fileName);
  if (shouldSwitchProjectRoot(detectedRoot)) {
    utils.setProjectRoot(detectedRoot);
    return true;
  }
  return false;
}

async function tryDetectProjectRoot(): Promise<boolean> {
  // Prefer the active editor if it is an xmake.lua file.
  if (tryDetectProjectRootFromDocument(vscode.window.activeTextEditor?.document)) {
    return true;
  }

  // Then scan currently opened documents.
  for (const document of vscode.workspace.textDocuments) {
    if (tryDetectProjectRootFromDocument(document)) {
      return true;
    }
  }

  // Finally, search the workspace for the first xmake.lua file.
  const files = await vscode.workspace.findFiles('**/xmake.lua', '**/.xmake/**', 1);
  if (files.length > 0) {
    const detectedRoot = path.dirname(files[0].fsPath);
    if (shouldSwitchProjectRoot(detectedRoot)) {
      utils.setProjectRoot(detectedRoot);
      return true;
    }
  }
  return false;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // this extension is activated!
  console.log('xmake-vscode: actived!');

  // init xmake plugin
  const xmake = new XMake(context);
  context.subscriptions.push(xmake);

  // register all commands of the xmake plugin
  function register(name: string, fn: (...args: any[]) => any) {
    fn = fn.bind(xmake);
    const slot = async (target: any) => {
      if (!utils.getProjectRoot()) {
        if (
          !!(await vscode.window.showErrorMessage(
            'no opened folder!',
            'Open a directory first!',
          ))
        ) {
          vscode.commands.executeCommand('vscode.openFolder');
        }
        return;
      }

      // check xmake
      if (
        0 !=
        (
          await process.runv(
            config.executable,
            ['--version'],
            { COLORTERM: 'nocolor' },
            config.workingDirectory,
          )
        ).retval
      ) {
        const choice = await vscode.window.showErrorMessage(
          'xmake not found!',
          'Install XMake',
        );
        if (choice === 'Install XMake') {
          await vscode.env.openExternal(vscode.Uri.parse('https://xmake.io'));
        }
        return;
      }

      // valid xmake project?
      switch (name) {
        case 'xmake.onCreateProject':
          if (fs.existsSync(path.join(config.workingDirectory, 'xmake.lua'))) {
            if (
              !(await vscode.window.showErrorMessage(
                'xmake.lua already exists!',
                'continue',
              ))
            ) {
              return;
            }
          }
          break;

        case 'xmake.onShowExplorer':
          break;

        default:
          if (!fs.existsSync(path.join(config.workingDirectory, 'xmake.lua'))) {
            if (
              !!(await vscode.window.showErrorMessage(
                'xmake.lua not found!',
                'Create a new xmake project',
              ))
            ) {
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
    'setProjectRoot',
    'setTargetPlat',
    'setTargetArch',
    'setBuildMode',
    'setDefaultTarget',
    'setTarget',
    'setTargetToolchain',
  ]) {
    context.subscriptions.push(register('xmake.' + key, (xmake as any)[key]));
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async document => {
      if (tryDetectProjectRootFromDocument(document)) {
        await xmake.onProjectRootChanged();
      }
    }),
  );

  // start xmake plugin
  await tryDetectProjectRoot();
  await xmake.start();
}

// this method is called when your extension is deactivated
export async function deactivate() {
}
