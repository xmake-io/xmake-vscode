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


/**
 * integrated: Use integrated terminal in VSCode
 * external: Use external terminal window
 * console: Use VScode Debug Console for stdout and stderr. Stdin will be unavailable
 * newExternal: Use external terminal window for console application, nothing for the others (only with cpptools)
 */
type Terminal = "integrated" | "external" | "console" | "newExternal";


interface DebugConfiguration extends vscode.DebugConfiguration {
    type: string;
    target: string;
    cwd?: string;
    stopAtEntry?: boolean;
    args?: Array<string> | string;
    terminal?: Terminal;
    env;
}

interface TargetInformations {
    rundir: string;
    path: string;
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

    private getTerminalCppTools(terminal: Terminal): string {
        switch (terminal) {
            case 'console':
                return 'internalConsole';
                break;
            case 'integrated':
                return 'integratedTerminal';
                break;
            case 'external':
                return 'externalTerminal';
                break;
            case 'newExternal':
                return 'newExternalWindow';
                break;
            default:
                return 'internalConsole';
                break;
        }
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
        config.program = targetInformations.path;

        // Set process name for an attach request
        if (config.request == 'attach') {
            config.processName = `${config.target}.exe`
        }

        //If cwd is empty, set the run directory as cwd
        if (!('cwd' in config)) {
            config.cwd = targetInformations.rundir;
        }

        // Get xmake env and merge it with config envs
        let xmakeEnvs = targetInformations.envs;

        if (settings.envBehaviour === 'override') {
            config.env = { ...xmakeEnvs, ...config.env };
        } else if (settings.envBehaviour === 'merge' && config.env !== undefined) {
            // Merge behaviour between xmake envs and launch.json envs
            for (const key in xmakeEnvs) {
                // If the key exist in xmake envs
                if (key in config.env) {
                    let sep = ':'
                    if (os.platform() == "win32") {
                        sep = ';'
                    }
                    // Concat the two envs
                    xmakeEnvs[key] += sep + config.env[key];
                    config.env[key] = xmakeEnvs[key];
                }
            }
        } else {
            // Copy xmake envs to config envs
            config.env = xmakeEnvs;
        }

        // Set the env for cpptools
        config.environment = convertEnvsToCppTools(config.env);

        // Configure debugger type
        // On windows, use vs debugger if it's not mingw
        config.type = 'cppdbg';
        if (os.platform() == 'win32' && this.getPlat() != 'mingw') {
            config.type = 'cppvsdbg';
        }

        // Switch to lldb if needed
        if (settings.debuggerBackend == "codelldb") {
            config.type = 'lldb';
            config.stopOnEntry = config.stopAtEntry;
            // Code LLDB doesn't support newExternal
            if (config.terminal == 'newExternal') {
                config.terminal = 'external';
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

        // Set the console for cpptools
        config.console = this.getTerminalCppTools(config.terminal);

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
        config = { ...config, ...setupCommands };

        return config;
    }
}

export function initDebugger(context: vscode.ExtensionContext, option: Option) {
    const extension = vscode.extensions.getExtension("ms-vscode.cpptools");
    if (!extension) {
        log.error("Cpp tools is not installed");
        return;
    }
    extension.activate();
    const provider = new XmakeConfigurationProvider(option);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('xmake', provider));
}