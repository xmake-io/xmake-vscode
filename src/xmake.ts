'use strict';

// imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {log} from './log';
import {config} from './config';
import {Terminal} from './terminal';
import {Status} from './status';
import {Option} from './option';

// the option arguments
export interface OptionArguments extends vscode.QuickPickItem {
    args: Map<string, string>;
}

// the xmake plugin
export class XMake implements vscode.Disposable {
   
    // enable plugin?
    private _enabled: boolean = false;

    // the terminal
    private _terminal: Terminal;

    // the option
    private _option: Option;

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
        this._option.dispose();
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
 
        // init option
        this._option = new Option();

        // TODO if no cache?
        // init platform
        const plat = {win32: 'windows', darwin: 'macosx', linux: 'linux'}[os.platform()];
        if (plat) {
            this._option.set("plat", plat);
            this._status.plat = plat;
        }

        // init architecture
        const arch = plat == "windows"? os.arch() : {x64: 'x86_64', x86: 'i386'}[os.arch()];
        if (arch) {
            this._option.set("arch", arch);
            this._status.arch = arch;
        }
        
        // init build mode
        this._option.set("mode", "release");
        this._status.mode = "release";

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

        // auto-generate a new xmake.lua
        this._terminal.execute("xmake f -y");
    }

    // on configure project
    async onConfigure(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // get the target platform
        let plat = this._option.get<string>("plat");

        // get the target architecture
        let arch = this._option.get<string>("arch");
        
        // get the build mode
        let mode = this._option.get<string>("mode");

        // configure it
        this._terminal.execute(`xmake f -p ${plat} -a ${arch} -m ${mode} -c`);
    }

    // on build project
    async onBuild(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // build it
        this._terminal.execute("xmake");
    }

    // on rebuild project
    async onRebuild(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        } 

        // rebuild it
        this._terminal.execute("xmake -r");
    }

    // on clean target files
    async onClean(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // clean it
        this._terminal.execute("xmake c");
    }

    // on clean all target files
    async onCleanAll(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // clean all
        this._terminal.execute("xmake c -a");
    }

    // on run target
    async onRun(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // run it
        this._terminal.execute("xmake r");
    }

    // on package target
    async onPackage(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // package it
        this._terminal.execute("xmake p");
    }

    // on debug target
    async onDebug(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // debug it
        this._terminal.execute("xmake r -d");
    }

    // set target platform
    async setTargetPlat(target?: string) {
        
         // this plugin enabled?
         if (!this._enabled) {
             return
         }

        // select platform
        let items: vscode.QuickPickItem[] = [];
        items.push({ label: "linux", description: "The Linux Platform"});
        items.push({ label: "macosx", description: "The MacOS Platform"});
        items.push({ label: "windows", description: "The Windows Platform"});
        items.push({ label: "android", description: "The Android Platform"});
        items.push({ label: "iphoneos", description: "The iPhoneOS Platform"});
        items.push({ label: "watchos", description: "The WatchOS Platform"});
        items.push({ label: "mingw", description: "The MingW Platform"});
        items.push({ label: "cross", description: "The Cross Platform"});
        const chosen: vscode.QuickPickItem|undefined = await vscode.window.showQuickPick(items);
        if (chosen) {
            this._option.set("plat", chosen.label);
            this._status.plat = chosen.label;
        }
    }

    // set target architecture
    async setTargetArch(target?: string) {
        
         // this plugin enabled?
         if (!this._enabled) {
             return
         }

        // select architecture
        let items: vscode.QuickPickItem[] = [];
        let plat = this._option.get<string>("plat");
        if (plat == "windows") {
            items.push({ label: "x86", description: "The x86 Architecture"});
            items.push({ label: "x64", description: "The x64 Architecture"});
        }
        else if (plat == "macosx" || plat == "linux" || plat == "mingw") {
            items.push({ label: "i386", description: "The i386 Architecture"});
            items.push({ label: "x86_64", description: "The x86_64 Architecture"});
        }
        else if (plat == "iphoneos") {
            items.push({ label: "armv7", description: "The armv7 Architecture"});
            items.push({ label: "armv7s", description: "The armv7s Architecture"});
            items.push({ label: "arm64", description: "The arm64 Architecture"});
            items.push({ label: "i386", description: "The i386 Architecture"});
            items.push({ label: "x86_64", description: "The x86_64 Architecture"});
        }
        else if (plat == "watchos") {
            items.push({ label: "armv7s", description: "The armv7s Architecture"});
            items.push({ label: "i386", description: "The i386 Architecture"});
        }
        else if (plat == "android") {
            items.push({ label: "armv5te", description: "The armv5te Architecture"});
            items.push({ label: "armv6", description: "The armv6 Architecture"});
            items.push({ label: "armv7-a", description: "The armv7-a Architecture"});
            items.push({ label: "armv8-a", description: "The armv8-a Architecture"});
            items.push({ label: "arm64-v8a", description: "The arm64-v8a Architecture"});
        }
        const chosen: vscode.QuickPickItem|undefined = await vscode.window.showQuickPick(items);
        if (chosen) {
            this._option.set("arch", chosen.label);
            this._status.arch = chosen.label;
        }
    }

    // set build mode
    async setBuildMode(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // select mode
        let items: vscode.QuickPickItem[] = [];
        items.push({ label: "debug", description: "The Debug Mode"});
        items.push({ label: "release", description: "The Release Mode"});
        const chosen: vscode.QuickPickItem|undefined = await vscode.window.showQuickPick(items);
        if (chosen) {
            this._option.set("mode", chosen.label);
            this._status.mode = chosen.label;
        }
    }

    // set default target
    async setDefaultTarget(target?: string) {
        
         // this plugin enabled?
         if (!this._enabled) {
             return
         }
     }
};