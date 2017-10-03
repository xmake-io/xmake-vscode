'use strict';

// imports
import * as vscode from 'vscode';
import * as process from './process';
import {log} from './log';
import {config} from './config';

// the xmake plugin
export class XMake implements vscode.Disposable {
   
    // the channel
    private _channel?: vscode.OutputChannel;
    
    // the constructor
    constructor(context: vscode.ExtensionContext) {

        // init log
        log.initialize(context);
    }

    // dispose all objects
    public async dispose() {
        await this.shutdown();
        this.channel.dispose();
    }
     
    // get the channel
    private get channel(): vscode.OutputChannel {
        if (!this._channel) {
            this._channel = vscode.window.createOutputChannel("xmake");
            this._channel.show();
        }
        return this._channel!;
    }

    // start xmake plugin
    async start(): Promise<void> {

        // trace
        log.verbose('start!');
    }

    // shutdown xmake plugin
    async shutdown() {

        // trace
        log.verbose('shutdown!');
    }

    // on build project
    async onBuild(target?: string) {

        // trace
        log.verbose('build!');

        // build it
        process.execv("xmake", [], {}, config.workingDirectory, this.channel);
    }

    // on rebuild project
    async onRebuild(target?: string) {
        
        // trace
        log.verbose('rebuild!');

        // rebuild it
        process.execv("xmake", ["-r"], {}, config.workingDirectory, this.channel);
    }

    // on clean project
    async onClean(target?: string) {
        
        // trace
        log.verbose('clean!');

        // rebuild it
        process.execv("xmake", ["c"], {}, config.workingDirectory, this.channel);
    }

    // on clean all project
    async onCleanAll(target?: string) {
        
        // trace
        log.verbose('clean all!');

        // rebuild it
        process.execv("xmake", ["c", "-a"], {}, config.workingDirectory, this.channel);
    }
};