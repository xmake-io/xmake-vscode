'use strict';

// imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {log} from './log';
import {config} from './config';
import {Terminal} from './terminal';
import {Status} from './status';

// the xmake plugin
export class XMake implements vscode.Disposable {
   
    // enable plugin?
    private _enabled: boolean = false;

    // the terminal
    private _terminal: Terminal;

    // the status
    private _status: Status;

    // the constructor
    constructor(context: vscode.ExtensionContext) {

        // init log
        log.initialize(context);
    }

    // dispose all objects
    public async dispose() {
        await this.shutdown();
        this._terminal.dispose();
        this._status.dispose();
    }

    // start xmake plugin
    async start(): Promise<void> {

        // trace
        log.verbose('start!');

        // valid xmake project?
        if (!fs.existsSync(path.join(config.workingDirectory, "xmake.lua"))) {
            if (!!(await vscode.window.showErrorMessage('xmake.lua not found!',
                'Quickstart a new XMake project'))) {
                await this.onQuickStart();
            }
            else return;
        }

        // init terminal
        this._terminal = new Terminal();

        // init status
        this._status = new Status();

        // enable this plugin
        this._enabled = true;
    }

    // shutdown xmake plugin
    async shutdown() {

        // trace
        log.verbose('shutdown!');

        // disable this plugin
        this._enabled = false;
    }

    // on quick start
    async onQuickStart(target?: string) {

        // trace
        log.verbose('quick start!');

        // auto-generate a new xmake.lua
        this._terminal.execute("xmake f -y");
    }

    // on configure project
    async onConfigure(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // trace
        log.verbose('configure!');

        // configure it
        this._terminal.execute("xmake f -c");
    }

    // on build project
    async onBuild(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // trace
        log.verbose('build!');

        // build it
        this._terminal.execute("xmake");
    }

    // on rebuild project
    async onRebuild(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        } 

        // trace
        log.verbose('rebuild!');

        // rebuild it
        this._terminal.execute("xmake -r");
    }

    // on clean target files
    async onClean(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // trace
        log.verbose('clean!');

        // clean it
        this._terminal.execute("xmake c");
    }

    // on clean all target files
    async onCleanAll(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // trace
        log.verbose('clean all!');

        // clean all
        this._terminal.execute("xmake c -a");
    }

    // on run target
    async onRun(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // trace
        log.verbose('run!');

        // run it
        this._terminal.execute("xmake r");
    }

    // on package target
    async onPackage(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // trace
        log.verbose('package!');

        // package it
        this._terminal.execute("xmake p");
    }
};