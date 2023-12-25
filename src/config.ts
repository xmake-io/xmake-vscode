'use strict';

// imports
import * as vscode from 'vscode';
import * as os from 'os';
import * as utils from './utils';
import {log} from './log';

// the config class
export class Config {

    // get config value
    public get<T>(key: string): T|null {
        const config = vscode.workspace.getConfiguration('xmake');
        if (config) {

            // get platform name
            const platform = {win32: 'windows', darwin: 'osx', linux: 'linux'}[os.platform()];

            // read value, attempt to get it from the "platform.key" first
            const value = config.get(`${platform}.${key}`);
            return (value !== undefined) ? value as T : config.get(key);
        }
    }

    // the xmake executable name / path
    get executable(): string {
        return utils.replaceVars(this.get<string>("executable"));
    }

    // the build directory
    get buildDirectory(): string {
        return utils.replaceVars(this.get<string>("buildDirectory"));
    }

    // the install directory
    get installDirectory(): string {
        return utils.replaceVars(this.get<string>("installDirectory"));
    }

    // the package directory
    get packageDirectory(): string {
        return utils.replaceVars(this.get<string>("packageDirectory"));
    }

    // the working directory
    get workingDirectory(): string {
        return utils.replaceVars(this.get<string>("workingDirectory"));
    }

    // the android ndk directory
    get androidNDKDirectory(): string {
        return utils.replaceVars(this.get<string>("androidNDKDirectory"));
    }

    // the qt directory
    get QtDirectory(): string {
        return utils.replaceVars(this.get<string>("QtDirectory"));
    }

    // the wdk directory
    get WDKDirectory(): string {
        return utils.replaceVars(this.get<string>("WDKDirectory"));
    }

    // the compile_commands.json directory
    get compileCommandsDirectory(): string {
        return utils.replaceVars(this.get<string>("compileCommandsDirectory"));
    }

    // the compile_commands.json lsp backend
    get compileCommandsBackend(): string {
        return utils.replaceVars(this.get<string>("compileCommandsBackend"));
    }

    // the additional config arguments
    get additionalConfigArguments(): string[] {
        let values = this.get("additionalConfigArguments");
        if (typeof values === "string") {
            return [utils.replaceVars(values)];
        }
        var results = []
        if (values) {
            for (let value of values as string[]) {
                results.push(utils.replaceVars(value))
            }
        }
        return results
    }

    // the running targets arguments
    get runningTargetsArguments(): { [key: string]: [string] } {
        return this.get<{}>("runningTargetsArguments");
    }

    // the debugging targets arguments
    get debuggingTargetsArguments(): { [key: string]: [string] } {
        return this.get<{}>("debuggingTargetsArguments");
    }

    get debugConfigType(): string {
        return utils.replaceVars(this.get<string>("debugConfigType"));
    }

    get customDebugConfig(): {} {
        return this.get<{}>("customDebugConfig");
    }

    get envBehaviour(): string {
        return this.get<string>("envBehaviour");
    }

    get enableSyntaxCheck(): boolean {
        return this.get<boolean>("enableSyntaxCheck");
    }
}

// init the global config
export const config: Config = new Config();
