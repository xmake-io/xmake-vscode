'use strict';

// imports
import * as vscode from 'vscode';

// the xmake plugin
export class XMake implements vscode.Disposable {
  
    // the constructor
    constructor(private _ctx: vscode.ExtensionContext) {
    }

    // dispose all objects
    public async dispose() {
        await this.shutdown();
    }

    // start xmake plugin
    async start(): Promise<void> {
        console.log('xmake: start!');
    }

    // shutdown xmake plugin
    async shutdown() {
        console.log('xmake: shutdown!');
    }

    // the interfaces
    async build(target?: string) 
    {
        console.log('xmake: build!');
    }
};