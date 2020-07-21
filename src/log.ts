'use strict';

// imports
import * as vscode from 'vscode';
import {config} from './config';

// the log level
export type LogLevel = 'verbose' | 'normal' | 'minimal';
export const LogLevel = {
    Verbose: 'verbose' as LogLevel,
    Normal: 'normal' as LogLevel,
    Minimal: 'minimal' as LogLevel
};

// the log class
class Log implements vscode.Disposable {

    // the log channel
    private _logChannel?: vscode.OutputChannel;

    // the log level
    private logLevel: LogLevel = LogLevel.Normal;

    // dispose
    public dispose() {
        if (this.logChannel) {
            this.logChannel.dispose();
        }
    }

    // get the log channel
    private get logChannel(): vscode.OutputChannel {
        /* we cannot use xmake/log channel now
        if (!this._logChannel) {
            this._logChannel = vscode.window.createOutputChannel("xmake");
        }*/
        return this._logChannel;
    }

    // the constructor
    public initialize(context: vscode.ExtensionContext) {
        vscode.workspace.onDidChangeConfiguration(this.onConfigurationChanged, this, context.subscriptions);
        this.onConfigurationChanged();
        if (this.logChannel) {
            this.logChannel.show();
        }
    }

    // fetch the configuration: xmake.logLevel
    private onConfigurationChanged(): void {
        const newLevel = config.get<LogLevel>('logLevel');
        if (newLevel)
            this.logLevel = newLevel;
    }

    // show error info
    public error(message: string): void {
        console.error(message);
        if (this.logChannel) {
            this.logChannel.appendLine(message); 
        }
    }

    // show info
    public info(message: string): void {
        console.info(message);
        if (this.logChannel && this.logLevel !== LogLevel.Minimal) {
            this.logChannel.appendLine(message);
        }
    }

    // show verbose info
    public verbose(message: string): void {
        console.log(message);
        if (this.logChannel && this.logLevel === LogLevel.Verbose) {
            this.logChannel.appendLine(message);
        }
    }
}

// init the global log
export const log: Log = new Log();