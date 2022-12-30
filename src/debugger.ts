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

interface DebugConfiguration extends vscode.DebugConfiguration {
    type: string;
    target: string;
    cwd?: string;
    stopAtEntry?: boolean;
    args?: Array<string> | string;
    env;
}

interface TargetInformations {
    rundir: string;
    path: string;
    name: string;
    envs;
}

/**
 * Get informations for xmake target
 * @param targetName xmake target
 * @returns TargetInformations
 */
async function getInformations(targetName: string): Promise<TargetInformations> {
    let getTargetInformationsScript = path.join(__dirname, `../../assets/target_informations.lua`);
    if (fs.existsSync(getTargetInformationsScript)) {
        let targetInformations = (await process.iorunv(settings.executable, ["l", getTargetInformationsScript, targetName], { "COLORTERM": "nocolor" }, settings.workingDirectory)).stdout.trim();
        if (targetInformations) {
            targetInformations = targetInformations.split("__end__")[0].trim();
            targetInformations = targetInformations.split('\n')[0].trim();
        }
        return JSON.parse(targetInformations);
    }

    return null;
}

/**
 * Get the Gnu Debugger path from xmake
 * @returns gbd path
 */
async function findGdbPath(): Promise<string> {
    let gdbPath = "";
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
 * Convert code lldb envs like to cpp tools env
 * @param envs 
 * @returns cpp tools envs
 */
function convertEnvsToCppTools(envs) {
    let cppToolsEnvs = []
    for (const key in envs) {
        cppToolsEnvs.push({ name: key, value: envs[key] });
    }
    return cppToolsEnvs;
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
    public async resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        const targetInformations = await getInformations(config.target);

        // Set the program path
        if (!(targetInformations.path && fs.existsSync(targetInformations.path))) {
            await vscode.window.showErrorMessage('The target program not found!');
            return { name: "Error: Target not found", type: "cppdbg", request: "launch" }; // Return a fake config
        }
        config.program = targetInformations.path;

        // Set process name for an h request
        if (config.request == 'attach') {
            config.processName = `${targetInformations.name}.exe`
        }

        //If cwd is empty, set the run directory as cwd
        if (!('cwd' in config)) {
            config.cwd = targetInformations.rundir;
        }

        // If args is empty, set it from config
        if (!('args' in config)) {
            let args = [];

            if (config.target in settings.debuggingTargetsArguments)
                args = settings.debuggingTargetsArguments[config.target];
            else if ("default" in settings.debuggingTargetsArguments)
                args = settings.debuggingTargetsArguments["default"];
            else if (config.target in settings.runningTargetsArguments)
                args = config.runningTargetsArguments[config.target];
            else if ("default" in settings.runningTargetsArguments)
                args = settings.runningTargetsArguments["default"];

            config.args = args;
        }

        // Set the envs for codelldb and cpptools
        config.env = targetInformations.envs;
        config.environment = convertEnvsToCppTools(targetInformations.envs);

        // Configure debugger type
        // On windows, use vs debugger if it's not mingw
        config.type = 'cppdbg';
        if (os.platform() == 'win32' && this.getPlat() != 'mingw') {
            config.type = 'cppvsdbg';
        }

        // Switch to lldb if needed
        if (settings.debugConfigType == "codelldb") {
            config.type = 'lldb';
            config.stopOnEntry = config.stopAtEntry;
            // CodeLLDB use program key for search a running procces
            if (config.request == 'attach') {
                config.stopOnEntry = false;
                config.program = `${targetInformations.name}.exe`;
            }
        }
        // Set MIMode for macos
        if (os.platform() == 'darwin') {
            config.MIMode = "lldb";
            config.miDebuggerPath = "";
        }

        // Set MIMode for linux or windows/linux mingw
        if (os.platform() == 'linux' || this.getPlat() == 'mingw') {
            config.MIMode = "gdb";
            config.miDebuggerPath = await findGdbPath();
        }

        // Merge pretty printing
        const setupCommands = {
            setupCommands: [
                {
                    description: "Enable pretty-printing for gdb",
                    text: "-enable-pretty-printing",
                    ignoreFailures: true
                }
            ]
        };
        // Merge setupCommands
        config = { ...config, ...setupCommands };

        // Merge the custom debug config with actual config
        config = { ...config, ...settings.customDebugConfig };

        return config;
    }
}

export function initDebugger(context: vscode.ExtensionContext, option: Option) {
    const cpptools = vscode.extensions.getExtension("ms-vscode.cpptools");
    const codelldb = vscode.extensions.getExtension("vadimcn.vscode-lldb");

    if (!cpptools && !codelldb) {
        log.error("Neither CppTools or Code LLDB is installed");
        vscode.window.showErrorMessage("Neither CppTools or Code LLDB is installed. Install one of this extension to debug");
        return;
    }

    if (!codelldb && settings.debugConfigType == 'codelldb') {
        vscode.window.showErrorMessage("Code LLDB is not installed. Install it first to use the debugger.");
    }

    // Activate the two extensions
    cpptools?.activate();
    codelldb?.activate()

    const provider = new XmakeConfigurationProvider(option);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('xmake', provider));
}