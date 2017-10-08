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

    // execute process
    private execv(program: string, args: string[]) {
        process.execv(program, args, {}, config.workingDirectory, this.channel);
    }

    // on configure project
    async onConfigure(target?: string) {
        
        // trace
        log.verbose('configure!');

        // configure it
        this.execv("xmake", ["f", "-c"]);
    }

    // on build project
    async onBuild(target?: string) {

        // trace
        log.verbose('build!');

        // build it
        this.execv("xmake", []);
    }

    // on rebuild project
    async onRebuild(target?: string) {
        
        // trace
        log.verbose('rebuild!');

        // rebuild it
        this.execv("xmake", ["-r"]);
    }

    // on clean target files
    async onClean(target?: string) {
        
        // trace
        log.verbose('clean!');

        // rebuild it
        this.execv("xmake", ["c"]);
    }

    // on clean all target files
    async onCleanAll(target?: string) {
        
        // trace
        log.verbose('clean all!');

        // rebuild it
        this.execv("xmake", ["c", "-a"]);
    }

    // on run target
    async onRun(target?: string) {
        
        // trace
        log.verbose('run!');

        // rebuild it
        this.execv("xmake", ["r"]);
    }

    // on package target
    async onPackage(target?: string) {
        
        // trace
        log.verbose('package!');

        // rebuild it
        this.execv("xmake", ["p"]);
    }
};