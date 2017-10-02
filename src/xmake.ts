'use strict';

// imports
import * as vscode from 'vscode';
import {log} from './log';

// the xmake plugin
export class XMake implements vscode.Disposable {
   
    // the constructor
    constructor(context: vscode.ExtensionContext) {

        // init log
        log.initialize(context);
    }

    // dispose all objects
    public async dispose() {
        await this.shutdown();
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
    }
};