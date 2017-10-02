'use strict';

// imports
import * as vscode from 'vscode';

// the log level
export type LogLevel = 'verbose' | 'normal' | 'minimal';
export const LogLevel = {
    Verbose: 'verbose' as LogLevel,
    Normal: 'normal' as LogLevel,
    Minimal: 'minimal' as LogLevel
};

// the log class
export class Log {

    // the log channel
    private _logChannel?: vscode.OutputChannel;

    // the log level
    private logLevel: LogLevel = LogLevel.Normal;

    // the log tag
    private static TAG: String = "xmake: ";

    // dispose
    private dispose() {
        this.logChannel.dispose();
    }

    // get the log channel
    private get logChannel(): vscode.OutputChannel {
        if (!this._logChannel) {
            this._logChannel = vscode.window.createOutputChannel("xmake/log");
        }
        return this._logChannel!;
    }

    // the constructor
    public initialize(context: vscode.ExtensionContext) {
        vscode.workspace.onDidChangeConfiguration(this.onConfigurationChanged, this, context.subscriptions);
        this.onConfigurationChanged();
        this.logChannel.show();
    }

    // fetch the configuration: xmake.logLevel
    private onConfigurationChanged(): void {
        const newLevel = vscode.workspace.getConfiguration('xmake').get<LogLevel>('logLevel');
        if (newLevel)
            this.logLevel = newLevel;
    }

    // show error info
    public error(message: string): void {
        console.error(Log.TAG + message);
        this.logChannel.appendLine(Log.TAG + message);
    }

    // show info
    public info(message: string): void {
        console.info(Log.TAG + message);
        if (this.logLevel !== LogLevel.Minimal) {
            this.logChannel.appendLine(Log.TAG + message);
        }
    }

    // show verbose info
    public verbose(message: string): void {
        console.log(Log.TAG + message);
        if (this.logLevel === LogLevel.Verbose) {
            this.logChannel.appendLine(Log.TAG + message);
        }
    }
}

// init the global log
export const log: Log = new Log();