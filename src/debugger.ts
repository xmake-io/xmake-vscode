'use strict';

// imports
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { WorkspaceFolder } from 'vscode';
import * as process from './process';

import { config as settings } from './config';
import { log } from './log';
import { Option } from './option';
import { debug } from 'console';
import { StreamPriorityOptions } from 'http2';


type Terminal = "integrated" | "external" | "console"
type DebugType = "cppvsdbg" | "cppdbg" | "lldb"
type Envs = {name: string, value: string}

interface DebugConfiguration extends vscode.DebugConfiguration {
    type: DebugType
    target: string;
    cwd?: string;
    stopAtEntry?: boolean;
    args?: Array<string> | string;
    terminal?: Terminal;
    environment: Array<Envs>
}


/**
 * Get the Gnu Debugger path from xmake
 * @returns gbd path
 */ 
async function findGdbPath(): Promise<string> {
    let gdbPath = null;
    let findGdbScript = path.join(__dirname, `../../assets/find_gdb.lua`);
    if (fs.existsSync(findGdbScript)) {
        gdbPath = (await process.iorunv(settings.executable, ["l", findGdbScript], { "COLORTERM": "nocolor" }, settings.workingDirectory)).stdout.trim();
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
        let targetRunDir = (await process.iorunv(settings.executable, ["l", getTargetRunDirScript, targetName], { "COLORTERM": "nocolor" }, settings.workingDirectory)).stdout.trim();
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
        let targetProgram = (await process.iorunv(settings.executable, ["l", getTargetPathScript, targetName], { "COLORTERM": "nocolor" }, settings.workingDirectory)).stdout.trim();
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
async function getEnvs(targetName: string): Promise<Envs> {
    let getTargetRunEnvsScript = path.join(__dirname, `../../assets/target_runenvs.lua`);
    if (fs.existsSync(getTargetRunEnvsScript)) {
        let targetRunEnvs = (await process.iorunv(settings.executable, ["l", getTargetRunEnvsScript, targetName], { "COLORTERM": "nocolor" }, settings.workingDirectory)).stdout.trim();
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

function convertEnvsToLLDB(envs: Array<Envs>) {
    let envsLLDB = {};
    for (let item of (envs as Array<Object>)) {
        let map = item as Map<String, String>;
        if (map) {
            let name = map["name"];
            let value = map["value"];
            if (name && value) {
                envsLLDB[name] = value;
            }
        }
    }
    return envsLLDB;
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
    public async resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: vscode.CancellationToken): Promise<DebugConfiguration> {
        
        // Set the current working directory
        if(config.cwd == "") {
            config.cwd = await getRunDirectory(config.target);
        }

        // Get xmake env and merge it with config envs
        // config envs will override xmake envs
        const xmakeEnvs = await getEnvs(config.target);
        config.environment = {...xmakeEnvs, ...config.environment};

        // Configure debugger type
        config.type = 'cppdbg';
        if(settings.debuggerBackend == "codelldb") {
            config.type = 'lldb';
            config.envs = convertEnvsToLLDB(config.environment);
        }
        // On windows, use vs debugger if it's not mingw
        if(os.platform() == 'win32' && this.getPlat() != 'mingw') {
            config.type = 'cppvsdbg';
        }

        return config;
    }
}

export function initDebugger(context: vscode.ExtensionContext, option: Option) {
    const provider = new XmakeConfigurationProvider(option);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('xmake', provider));
}