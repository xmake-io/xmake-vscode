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
import {ProblemList} from './problem';
import {Completion} from './completion';
import * as process from './process';
import * as utils from './utils';

// the option arguments
export interface OptionArguments extends vscode.QuickPickItem {
    args: Map<string, string>;
}

// the xmake plugin
export class XMake implements vscode.Disposable {

    // the extension context
    private _context: vscode.ExtensionContext;
   
    // enable plugin?
    private _enabled: boolean = false;

    // option changed?
    private _optionChanged: boolean = true;

    // the problems
    private _problems: ProblemList;

    // the terminal
    private _terminal: Terminal;

    // the option
    private _option: Option;

    // the status
    private _status: Status;

    // the cache file watcher
    private _fileSystemWatcher: vscode.FileSystemWatcher;
    
    // the constructor
    constructor(context: vscode.ExtensionContext) {
        
        // save context
        this._context = context;

        // init log
        log.initialize(context);
    }

    // dispose all objects
    public async dispose() {
        await this.stop();
        this._terminal.dispose();
        this._status.dispose();
        this._option.dispose();
        this._problems.dispose();
        this._fileSystemWatcher.dispose();
    }

    // load cache
    async loadCache() {
       
        // load cached configure
        let cacheJson = (await process.iorunv("xmake", ["l", "-c", 'import("core.project.config"); config.load(); print("{\\\"plat\\\":\\\"$(plat)\\\", \\\"arch\\\":\\\"$(arch)\\\", \\\"mode\\\":\\\"$(mode)\\\"}")'], {}, config.workingDirectory)).stdout;
        if (cacheJson) cacheJson = JSON.parse(cacheJson);

        // init platform
        const plat = cacheJson["plat"]? cacheJson["plat"] : {win32: 'windows', darwin: 'macosx', linux: 'linux'}[os.platform()];
        if (plat) {
            this._option.set("plat", plat);
            this._status.plat = plat;
        }

        // init architecture
        const arch = cacheJson["arch"]? cacheJson["arch"] : (plat == "windows"? os.arch() : {x64: 'x86_64', x86: 'i386'}[os.arch()]);
        if (arch) {
            this._option.set("arch", arch);
            this._status.arch = arch;
        }
        
        // init build mode
        const mode = cacheJson["mode"]? cacheJson["mode"] : "release";
        this._option.set("mode", mode);
        this._status.mode = mode;
    }

    // init watcher
    async initWatcher() {
        
        // init file system watcher
        this._fileSystemWatcher = vscode.workspace.createFileSystemWatcher(path.join(config.workingDirectory, ".xmake", "*"));
		this._fileSystemWatcher.onDidCreate(this.onFileCreate.bind(this));
        this._fileSystemWatcher.onDidChange(this.onFileChange.bind(this));
        this._fileSystemWatcher.onDidDelete(this.onFileDelete.bind(this));
    }

    // on File Create
    async onFileCreate(affectedPath: vscode.Uri) {

        // trace
        log.verbose("onFileCreate: " + affectedPath.fsPath);

        // wait some times
        await utils.sleep(2000);
        
        // update configure cache
        let filePath = affectedPath.fsPath;
        if (filePath.includes("xmake.conf")) {
            this.loadCache();
        // update problems
        } else if (filePath.includes("vscode-build.log")) {
            this._problems.diagnose(filePath);
        }
    }

    // on File Change
    async onFileChange(affectedPath: vscode.Uri) {

        // trace
        log.verbose("onFileChange: " + affectedPath.fsPath);   
        
        // wait some times
        await utils.sleep(2000);

        // update configure cache
        let filePath = affectedPath.fsPath;
        if (filePath.includes("xmake.conf")) {  
            this.loadCache();
        // update problems
        } else if (filePath.includes("vscode-build.log")) {
            this._problems.diagnose(filePath);
        } 
    }

    // on File Delete
    async onFileDelete(affectedPath: vscode.Uri) {

        // trace
        log.verbose("onFileDelete: " + affectedPath.fsPath);  
    
        // wait some times
        await utils.sleep(2000);
        
        // update configure cache
        let filePath = affectedPath.fsPath;
        if (filePath.includes("xmake.conf")) {
            this.loadCache();
        // clear problems
        } else if (filePath.includes("vscode-build.log")) {
            this._problems.clear();
        }
    }

    // start xmake plugin
    async start(): Promise<void> {

        // trace
        log.verbose('start!');

        // check xmake
        /*
        if (0 != (await process.runv("xmake", ["--version"], {}, config.workingDirectory)).retval) {
            if (!!(await vscode.window.showErrorMessage('xmake not found!',
                'Access http://xmake.io to download and install xmake first!'))) {
            }
            return;
        }*/

        // valid xmake project?
        if (!fs.existsSync(path.join(config.workingDirectory, "xmake.lua"))) {
            if (!!(await vscode.window.showErrorMessage('xmake.lua not found!',
                'Quickstart a new XMake project'))) {
                await this.onQuickStart();
            }
            else return;
        }

        // init languages
        vscode.languages.registerCompletionItemProvider("xmake", new Completion());

        // init terminal
        if (!this._terminal) {
            this._terminal = new Terminal();
        }

        // init problems
        this._problems = new ProblemList();
        
        // init status
        this._status = new Status();
 
        // init option
        this._option = new Option();

        // load cached configure
        this.loadCache();

        // init watcher
        this.initWatcher();

        // enable this plugin
        this._enabled = true;
    }

    // shutdown xmake plugin
    async stop(): Promise<void> {

        // trace
        log.verbose('stop!');

        // disable this plugin
        this._enabled = false;
    }

    // on quick start
    async onQuickStart(target?: string) {

        // init terminal
        if (!this._terminal) {
            this._terminal = new Terminal();
        }
        
        // auto-generate a new xmake.lua
        this._terminal.execute("xmake f -y");
    }

    // on configure project
    async onConfigure(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // option changed?
        if (this._optionChanged) {

            // get the target platform
            let plat = this._option.get<string>("plat");

            // get the target architecture
            let arch = this._option.get<string>("arch");
            
            // get the build mode
            let mode = this._option.get<string>("mode");

            // make command
            let command = `xmake f -p ${plat} -a ${arch} -m ${mode}`;
            if (this._option.get<string>("plat") == "android" && config.androidNDKDirectory != "") {
                command += ` --ndk=\"${config.androidNDKDirectory}\"`;
            }
            if (config.buildDirectory != "" && config.buildDirectory != path.join(vscode.workspace.rootPath, "build")) {
                command += ` -o ${config.buildDirectory}`
            }
            if (config.additionalConfigArguments) {
                command += ` ${config.additionalConfigArguments}`
            }

            // configure it
            this._terminal.execute(command);

            // mark as not changed
            this._optionChanged = false;
        }
    }

    // on clean configure project
    async onCleanConfigure(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // make command
        let command = `xmake f -c`;
        if (config.buildDirectory != "" && config.buildDirectory != path.join(vscode.workspace.rootPath, "build")) {
            command += ` -o ${config.buildDirectory}`
        }
        if (config.additionalConfigArguments) {
            command += ` ${config.additionalConfigArguments}`
        }
 
        // configure it
        this._terminal.execute(command);

        // mark as not changed
        this._optionChanged = false;
    }

    // on build project
    async onBuild(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // configure it first
        this.onConfigure(target);

        // add build level to command     
        const targetname = this._option.get<string>("target");        
        const buildLevel = config.get<string>("buildLevel");
        let command = "xmake"  
        if (targetname && targetname != "default")
            command += " build";
        if (buildLevel == "verbose") 
            command += " -v";
        else if (buildLevel == "warning") 
            command += " -w";
        else if (buildLevel == "debug") 
            command += " -v --backtrace";

        // add build target to command
        if (targetname && targetname != "default")
            command += ` ${targetname}`;
        else if (targetname == "all")
            command += " -a";

        // build it
        this._terminal.execute(command); 
    }

    // on rebuild project
    async onRebuild(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        } 

        // configure it first
        this.onConfigure(target);
        
        // add build level to command      
        const buildLevel = config.get<string>("buildLevel");
        let command = "xmake -r"  
        if (buildLevel == "verbose") 
            command += " -v";
        else if (buildLevel == "warning") 
            command += " -w";
        else if (buildLevel == "debug") 
            command += " -v --backtrace";

        // add build target to command
        const targetname = this._option.get<string>("target");
        if (targetname && targetname != "default")
            command += ` ${targetname}`;
        else if (targetname == "all")
            command += " -a";

        // build it
        this._terminal.execute(command); 
    }

    // on clean target files
    async onClean(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // configure it first
        this.onConfigure(target);
       
        // get target name 
        const targetname = this._option.get<string>("target");
        
        // clean it
        if (targetname && targetname != "default")
            this._terminal.execute(`xmake c ${targetname}`);
        else this._terminal.execute("xmake c"); 
    }

    // on clean all target files
    async onCleanAll(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // configure it first
        this.onConfigure(target);
        
        // get target name 
        const targetname = this._option.get<string>("target");
        
        // clean all
        if (targetname && targetname != "default")
            this._terminal.execute(`xmake c -a ${targetname}`);
        else this._terminal.execute("xmake c -a "); 
    }

    // on run target
    async onRun(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // configure it first
        this.onConfigure(target);
        
        // get target name 
        const targetname = this._option.get<string>("target");
        
        // run it
        if (targetname && targetname != "default")
            this._terminal.execute(`xmake r ${targetname}`);
        else if (targetname == "all")
            this._terminal.execute("xmake r -a");
        else this._terminal.execute("xmake r");   
    }

    // on package target
    async onPackage(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // configure it first
        this.onConfigure(target);
        
        // get target name 
        const targetname = this._option.get<string>("target");
        
        // make command
        let command = "xmake p"
        if (targetname && targetname != "default")
            command += ` ${targetname}`;
        else if (targetname == "all")
            command += " -a";

        // package it
        this._terminal.execute(command);
    }

    // on install target
    async onInstall(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
  
        // configure it first
        this.onConfigure(target);
         
        // get target name 
        const targetname = this._option.get<string>("target");
         
        // make command
        let command = "xmake install"
        if (targetname && targetname != "default")
            command += ` ${targetname}`;
        else if (targetname == "all")
            command += " -a";
        if (config.installDirectory != "")
            command += ` -o ${config.installDirectory}`;

        // install it
        this._terminal.execute(command);
    }

    // on uninstall target
    async onUninstall(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
  
        // configure it first
        this.onConfigure(target);
         
        // get target name 
        const targetname = this._option.get<string>("target");
         
        // make command
        let command = "xmake uninstall"
        if (targetname && targetname != "default")
            command += ` ${targetname}`;
        if (config.installDirectory != "")
            command += ` --installdir=${config.installDirectory}`;

        // uninstall it
        this._terminal.execute(command);  
    }

    // on debug target
    async onDebug(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // configure it first
        this.onConfigure(target);
        
        // get target name 
        const targetname = this._option.get<string>("target");
        
        // debug it
        if (targetname && targetname != "default")
            this._terminal.execute(`xmake r -d ${targetname}`);
        else
            this._terminal.execute("xmake r -d");
    }

    // on macro begin
    async onMacroBegin(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // begin marco
        this._terminal.execute("xmake m -b");

        // update status: start to record
        this._status.startRecord();
    }

    // on macro end
    async onMacroEnd(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // end marco
        this._terminal.execute("xmake m -e");

        // update status: stop to record
        this._status.stopRecord();
    }

    // on macro run
    async onMacroRun(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // end marco
        this._terminal.execute("xmake m .");
    }

    // on run last command
    async onRunLastCommand(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // end marco
        this._terminal.execute("xmake m ..");
    }

    // set target platform
    async setTargetPlat(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // select platform
        let items: vscode.QuickPickItem[] = [];
        items.push({label: "linux", description: "The Linux Platform"});
        items.push({label: "macosx", description: "The MacOS Platform"});
        items.push({label: "windows", description: "The Windows Platform"});
        items.push({label: "android", description: "The Android Platform"});
        items.push({label: "iphoneos", description: "The iPhoneOS Platform"});
        items.push({label: "watchos", description: "The WatchOS Platform"});
        items.push({label: "mingw", description: "The MingW Platform"});
        items.push({label: "cross", description: "The Cross Platform"});
        const chosen: vscode.QuickPickItem|undefined = await vscode.window.showQuickPick(items);
        if (chosen && chosen.label !== this._option.get<string>("plat")) {

            // update platform
            this._option.set("plat", chosen.label);
            this._status.plat = chosen.label;
            this._optionChanged = true;

            // update architecture  
            let plat = chosen.label;
            let arch = "";
            const host = {win32: 'windows', darwin: 'macosx', linux: 'linux'}[os.platform()];
            if (plat == host) {
                arch = (plat == "windows"? os.arch() : {x64: 'x86_64', x86: 'i386'}[os.arch()]);
            }
            else {
                arch = {windows: "x86", macosx: "x86_64", linux: "x86_64", mingw: "x86_64", iphoneos: "arm64", watchos: "armv7k", android: "armv7-a"}[plat];
            }
            if (arch && arch != "") {
                this._option.set("arch", arch);
                this._status.arch = arch;
            }
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
            items.push({label: "x86", description: "The x86 Architecture"});
            items.push({label: "x64", description: "The x64 Architecture"});
        }
        else if (plat == "macosx" || plat == "linux" || plat == "mingw") {
            items.push({label: "i386", description: "The i386 Architecture"});
            items.push({label: "x86_64", description: "The x86_64 Architecture"});
        }
        else if (plat == "iphoneos") {
            items.push({label: "armv7", description: "The armv7 Architecture"});
            items.push({label: "armv7s", description: "The armv7s Architecture"});
            items.push({label: "arm64", description: "The arm64 Architecture"});
            items.push({label: "i386", description: "The i386 Architecture"});
            items.push({label: "x86_64", description: "The x86_64 Architecture"});
        }
        else if (plat == "watchos") {
            items.push({label: "armv7k", description: "The armv7s Architecture"});
            items.push({label: "i386", description: "The i386 Architecture"});
        }
        else if (plat == "android") {
            items.push({label: "armv5te", description: "The armv5te Architecture"});
            items.push({label: "armv6", description: "The armv6 Architecture"});
            items.push({label: "armv7-a", description: "The armv7-a Architecture"});
            items.push({label: "armv8-a", description: "The armv8-a Architecture"});
            items.push({label: "arm64-v8a", description: "The arm64-v8a Architecture"});
        }
        const chosen: vscode.QuickPickItem|undefined = await vscode.window.showQuickPick(items);
        if (chosen && chosen.label !== this._option.get<string>("arch")) {
            this._option.set("arch", chosen.label);
            this._status.arch = chosen.label;
            this._optionChanged = true;
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
        items.push({label: "debug", description: "The Debug Mode"});
        items.push({label: "release", description: "The Release Mode"});
        const chosen: vscode.QuickPickItem|undefined = await vscode.window.showQuickPick(items);
        if (chosen && chosen.label !== this._option.get<string>("mode")) {
            this._option.set("mode", chosen.label);
            this._status.mode = chosen.label;
            this._optionChanged = true;
        }
    }

    // set default target
    async setDefaultTarget(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // get target names
        let targets = (await process.iorunv("xmake", ["l", "-c", 'import("core.project.config"); import("core.project.project"); config.load(); for name, _ in pairs((project.targets())) do print(name) end'], {}, config.workingDirectory)).stdout;

        // select target
        let items: vscode.QuickPickItem[] = [];
        items.push({label: "default", description: "All Default Targets"});
        items.push({label: "all", description: "All Targets"});
        if (targets) {
            targets.split('\n').forEach(element => {
                if (element.length > 0)
                    items.push({label: element, description: "The Project Target: " + element}); 
            });
        }
        const chosen: vscode.QuickPickItem|undefined = await vscode.window.showQuickPick(items);
        if (chosen && chosen.label !== this._option.get<string>("target")) {
            this._option.set("target", chosen.label);
            this._status.target = chosen.label;
        }
    }
};