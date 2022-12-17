'use strict';

// imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceFolder } from 'vscode';
import * as process from './process';

import {Option} from './option';
import { log } from './log';
import { config } from './config';



/**
 * Get the Gnu Debugger path from xmake
 * @returns gbd path
 */ 
async function findGdbPath(): Promise<string> {
    let gdbPath = null;
    let findGdbScript = path.join(__dirname, `../../assets/find_gdb.lua`);
    if (fs.existsSync(findGdbScript)) {
        gdbPath = (await process.iorunv(config.executable, ["l", findGdbScript], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
        if (gdbPath) {
            gdbPath = gdbPath.split('\n')[0].trim();
        }
    }
    return gdbPath ? gdbPath : "";
}

/**
 * Get the running directory of a given target
 * @param targetName xmake target
 * @returns running directory path
*/
async function getRunDirectory(targetName: string): Promise<string> {
    let getTargetRunDirScript = path.join(__dirname, `../../assets/target_rundir.lua`);
    if (fs.existsSync(getTargetRunDirScript)) {
        let targetRunDir = (await process.iorunv(config.executable, ["l", getTargetRunDirScript, targetName], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
        if (targetRunDir) {
            targetRunDir = targetRunDir.split("__end__")[0].trim();
            targetRunDir = targetRunDir.split('\n')[0].trim();

            return targetRunDir;
        }
    }
    return null;
}

/**
 * Get the executable path from a target name
 * @param targetName xmake target
 * @returns executable path
*/
async function getProgram(targetName: string): Promise<string> {
    let getTargetPathScript = path.join(__dirname, `../../assets/targetpath.lua`);
    if (fs.existsSync(getTargetPathScript)) {
        let targetProgram = (await process.iorunv(config.executable, ["l", getTargetPathScript, targetName], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
        if (targetProgram) {
            targetProgram = targetProgram.split("__end__")[0].trim();
            targetProgram = targetProgram.split('\n')[0].trim();

            return targetProgram;
        }
    }
    return null;
}

/**
 * Get envs for xmake target
 * @param targetName xmake target
 * @returns return object like { "name": "config", "value": "Debug" }
 */
async function getEnvs(targetName: string): Promise<string> {
    let getTargetRunEnvsScript = path.join(__dirname, `../../assets/target_runenvs.lua`);
    if (fs.existsSync(getTargetRunEnvsScript)) {
        let targetRunEnvs = (await process.iorunv(config.executable, ["l", getTargetRunEnvsScript, targetName], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
        if (targetRunEnvs) {
            targetRunEnvs = targetRunEnvs.split("__end__")[0].trim();
            targetRunEnvs = targetRunEnvs.split('\n')[0].trim();
        }
        if (targetRunEnvs) {
            targetRunEnvs = JSON.parse(targetRunEnvs);
        } else {
            targetRunEnvs = null;
        }
        return null;
    }

    return null;
}


class XmakeConfigurationProvider implements vscode.DebugConfigurationProvider {

    private option: Option

    constructor(option: Option) {
        this.option = option;
    }


    private getPlat(): string {
        return this.option.get<string>("plat");
    }

    /**
     *  Resolve the xmake debug configuration.
     * @param folder current folder path. Will be used if cwd in launch.json is not set
     * @param config the actual xmake debug config
     * @param token 
     * @returns the modified config to cpptols or codelldb
     */
    public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
        config.type = 'python';
        config.name = 'Launch';
        config.request = 'launch';
        config.stopOnEntry = true;

        return config;
    }
}

export function initDebugger(context: vscode.ExtensionContext, option: Option) {
    const provider = new XmakeConfigurationProvider(option);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('xmake', provider));
}