'use strict';

// imports
import * as vscode from 'vscode';
import * as os from 'os';
import * as utils from './utils';

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

    // the working directory
    get workingDirectory(): string {
        return utils.replaceVars(this.get<string>("workingDirectory"));
    }
}

// init the global config
export const config: Config = new Config();