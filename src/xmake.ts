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
import {Debugger} from './debugger';
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

    // the debugger
    private _debugger: Debugger;

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
        this._debugger.dispose();
        this._fileSystemWatcher.dispose();
    }

    // load cache
    async loadCache() {

        // load config cache
        let cacheJson = {}
        let getConfigPathScript = path.join(__dirname, `../../assets/config.lua`);
        if (fs.existsSync(getConfigPathScript)) {
            let configs = (await process.iorunv("xmake", ["l", getConfigPathScript], {"COLORTERM": "nocolor"}, config.workingDirectory)).stdout.trim();
            if (configs) {
                configs = configs.split('__end__')[0].trim();
                cacheJson = JSON.parse(configs);
            }
        }

        // init platform
        const plat = ("plat" in cacheJson && cacheJson["plat"] != "")? cacheJson["plat"] : {win32: 'windows', darwin: 'macosx', linux: 'linux'}[os.platform()];
        if (plat) {
            this._option.set("plat", plat);
            this._status.plat = plat;
        }

        // init architecture
        const arch = ("arch" in cacheJson && cacheJson["arch"] != "")? cacheJson["arch"] : (plat == "windows"? "x86" : {x64: 'x86_64', x86: 'i386'}[os.arch()]);
        if (arch) {
            this._option.set("arch", arch);
            this._status.arch = arch;
        }
        
        // init build mode
        const mode = ("mode" in cacheJson && cacheJson["mode"] != "")? cacheJson["mode"] : "release";
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

    // refresh folder
    async refreshFolder() {

        // wait some times
        await utils.sleep(2000);       
        
        // refresh it
        vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
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

    // start plugin
    async startPlugin() {

        // has been enabled?
        if (this._enabled) {
            return ;
        }

        // init languages
        vscode.languages.registerCompletionItemProvider("xmake", new Completion());

        // init terminal
        if (!this._terminal) {
            this._terminal = new Terminal();
        }

        // init problems
        this._problems = new ProblemList();

        // init debugger
        this._debugger = new Debugger();
        
        // init status
        this._status = new Status();
 
        // init option
        this._option = new Option();

        // load cached configure
        this.loadCache();

        // init watcher
        this.initWatcher();

        // init project name
        let projectName = path.basename(utils.getProjectRoot());
        this._option.set("project", projectName);
        this._status.project = projectName;

        // enable this plugin
        this._enabled = true;
    }

    // create project
    async createProject() {

        // select language
        let getLanguagesScript = path.join(__dirname, `../../assets/languages.lua`);
        let gettemplatesScript = path.join(__dirname, `../../assets/templates.lua`);
        if (fs.existsSync(getLanguagesScript) && fs.existsSync(gettemplatesScript)) {
            let result = (await process.iorunv("xmake", ["l", getLanguagesScript], {"COLORTERM": "nocolor"}, config.workingDirectory)).stdout.trim();
            if (result) {
                let items: vscode.QuickPickItem[] = [];
                result.split("\n").forEach(element => {
                    items.push({label: element.trim(), description: ""});
                }); 
                const chosen: vscode.QuickPickItem|undefined = await vscode.window.showQuickPick(items);
                if (chosen) {

                    // select template
                    let result2 = (await process.iorunv("xmake", ["l", gettemplatesScript, chosen.label], {"COLORTERM": "nocolor"}, config.workingDirectory)).stdout.trim();
                    if (result2) {
                        let items2: vscode.QuickPickItem[] = [];
                        result2.split("\n").forEach(element => {
                            items2.push({label: element.trim(), description: ""});
                        }); 
                        const chosen2: vscode.QuickPickItem|undefined = await vscode.window.showQuickPick(items2);
                        if (chosen2) {

                            // create project
                            if (!this._terminal) {
                                this._terminal = new Terminal();
                            }
                            await this._terminal.execute("create", `xmake create -t ${chosen2.label} -l ${chosen.label} -P ${config.workingDirectory}`);

                            // start plugin
                            this.startPlugin();

                            // refresh folder
                            await this.refreshFolder();
                        }
                    }        
                }
            }
        }    
    }

    // start xmake plugin
    async start(): Promise<void> {

        // open project directory first!
        if (!utils.getProjectRoot()) {
            if (!!(await vscode.window.showErrorMessage('no opened folder!',
            'Open a xmake project directory first!'))) {
                vscode.commands.executeCommand('vscode.openFolder');
            }
            return;
        }

        // trace
        log.verbose(`start in ${config.workingDirectory}`);

        // check xmake
        if (0 != (await process.runv("xmake", ["--version"], {"COLORTERM": "nocolor"}, config.workingDirectory)).retval) {
            if (!!(await vscode.window.showErrorMessage('xmake not found!',
                'Access https://xmake.io to download and install xmake first!'))) {
            }
            return;
        }

        // valid xmake project?
        if (!fs.existsSync(path.join(config.workingDirectory, "xmake.lua"))) {
            if (!!(await vscode.window.showErrorMessage('xmake.lua not found!',
                'Create a new xmake project'))) {
                await this.createProject();
            }
            return;
        }

        // start plugin
        this.startPlugin();
    }

    // shutdown xmake plugin
    async stop(): Promise<void> {

        // trace
        log.verbose('stop!');

        // disable this plugin
        this._enabled = false;
    }

    // on create project
    async onCreateProject(target?: string) {
        if (this._enabled) {
            this.createProject();
        }
    }

    // on new files
    async onNewFiles(target?: string) {

        if (!this._enabled) {
            return ;
        }

        // select files
        let getFilesListScript = path.join(__dirname, `../../assets/newfiles.lua`);
        if (fs.existsSync(getFilesListScript) && fs.existsSync(getFilesListScript)) {
            let result = (await process.iorunv("xmake", ["l", getFilesListScript], {"COLORTERM": "nocolor"}, config.workingDirectory)).stdout.trim();
            if (result) {
                let items: vscode.QuickPickItem[] = [];
                result.split("\n").forEach(element => {
                    items.push({label: element.trim(), description: ""});
                }); 
                const chosen: vscode.QuickPickItem|undefined = await vscode.window.showQuickPick(items);
                if (chosen) {
                    let filesdir = path.join(__dirname, "..", "..", "assets", "newfiles", chosen.label);
                    if (fs.existsSync(filesdir)) {

                        // copy files
                        await process.runv("xmake", ["l", "os.cp", path.join(filesdir, "*"), config.workingDirectory], {"COLORTERM": "nocolor"}, config.workingDirectory);

                        // refresh folder
                        await this.refreshFolder();
                    }
                }
            }
        }
    }

    // on configure project
    async onConfigure(target?: string): Promise<boolean> {

        // this plugin enabled?
        if (!this._enabled) {
            return false;
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
            if (config.QtDirectory != "") {
                command += ` --qt=\"${config.QtDirectory}\"`;
            }
            if (config.WDKDirectory != "") {
                command += ` --wdk=\"${config.WDKDirectory}\"`;
            }
            if (config.buildDirectory != "" && config.buildDirectory != path.join(utils.getProjectRoot(), "build")) {
                command += ` -o \"${config.buildDirectory}\"`
            }
            if (config.additionalConfigArguments) {
                command += ` ${config.additionalConfigArguments}`
            }

            // configure it
            await this._terminal.execute("config", command);

            // mark as not changed
            this._optionChanged = false;
            return true;
        }
        return false;
    }

    // on clean configure project
    async onCleanConfigure(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // make command
        let command = `xmake f -c`;
        if (config.buildDirectory != "" && config.buildDirectory != path.join(utils.getProjectRoot(), "build")) {
            command += ` -o \"${config.buildDirectory}\"`
        }
        if (config.additionalConfigArguments) {
            command += ` ${config.additionalConfigArguments}`
        }
 
        // configure it
        await this._terminal.execute("clean config", command);

        // mark as not changed
        this._optionChanged = false;
    }

    // on build project
    async onBuild(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // add build level to command     
        const targetName = this._option.get<string>("target");        
        const buildLevel = config.get<string>("buildLevel");
        let command = "xmake"  
        if (targetName && targetName != "default")
            command += " build";
        if (buildLevel == "verbose") 
            command += " -v";
        else if (buildLevel == "warning") 
            command += " -w";
        else if (buildLevel == "debug") 
            command += " -v --backtrace";

        // add build target to command
        if (targetName && targetName != "default")
            command += ` ${targetName}`;
        else if (targetName == "all")
            command += " -a";

        // configure and build it
        await this.onConfigure(target);
        await this._terminal.execute("build", command); 
    }

    // on rebuild project
    async onRebuild(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        } 

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
        const targetName = this._option.get<string>("target");
        if (targetName && targetName != "default")
            command += ` ${targetName}`;
        else if (targetName == "all")
            command += " -a";

        // configure and rebuild it
        await this.onConfigure(target);
        await this._terminal.execute("rebuild", command); 
    }

    // on clean target files
    async onClean(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // get target name 
        const targetName = this._option.get<string>("target");
        
        // make command
        let command = "xmake c";
        if (targetName && targetName != "default")
            command += ` ${targetName}`;

        // configure and clean it
        await this.onConfigure(target);
        await this._terminal.execute("clean", command); 
    }

    // on clean all target files
    async onCleanAll(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // get target name 
        const targetName = this._option.get<string>("target");
        
        // make command
        let command = "xmake c -a";
        if (targetName && targetName != "default")
            command += ` ${targetName}`;

        // configure and clean all
        await this.onConfigure(target);
        await this._terminal.execute("clean all", command);
    }

    // on run target
    async onRun(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // get target name 
        let targetName = this._option.get<string>("target");
        if (!targetName) {
            let getDefaultTargetPathScript = path.join(__dirname, `../../assets/default_target.lua`);
            if (fs.existsSync(getDefaultTargetPathScript)) {
                let result = (await process.iorunv("xmake", ["l", getDefaultTargetPathScript], {"COLORTERM": "nocolor"}, config.workingDirectory)).stdout.trim();
                if (result) {
                    targetName = result.split('__end__')[0].trim();
                }
            }    
        }
        
        // get target arguments
        let args = [];
        if (targetName && targetName in config.debuggingTargetsArguments)
            args = config.debuggingTargetsArguments[targetName];
        else if ("default" in config.debuggingTargetsArguments)
            args = config.debuggingTargetsArguments["default"];

        // make command line arguments string
        let argstr = "";
        if (args.length > 0) {
            argstr = '"' + args.join('" "') + '"';
        }
        
        // make command
        let command = "xmake r"
        if (targetName && targetName != "default")
            command += ` ${targetName} ${argstr}`;
        else if (targetName == "all")
            command += " -a";
        else command += ` ${argstr}`; 
        
        // configure and run it
        await this.onConfigure(target);
        await this._terminal.execute("run", command);
    }

    // on package target
    async onPackage(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
 
        // get target name 
        const targetName = this._option.get<string>("target");
        
        // make command
        let command = "xmake p"
        if (targetName && targetName != "default")
            command += ` ${targetName}`;
        else if (targetName == "all")
            command += " -a";

        // configure and package it
        await this.onConfigure(target);
        await this._terminal.execute("package", command); 
    }

    // on install target
    async onInstall(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
  
        // get target name 
        const targetName = this._option.get<string>("target");
         
        // make command
        let command = "xmake install"
        if (targetName && targetName != "default")
            command += ` ${targetName}`;
        else if (targetName == "all")
            command += " -a";
        if (config.installDirectory != "")
            command += ` -o \"${config.installDirectory}\"`;

        // configure and install it
        await this.onConfigure(target);
        await this._terminal.execute("install", command); 
    }

    // on uninstall target
    async onUninstall(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }
  
        // get target name 
        const targetName = this._option.get<string>("target");
         
        // make command
        let command = "xmake uninstall"
        if (targetName && targetName != "default")
            command += ` ${targetName}`;
        if (config.installDirectory != "")
            command += ` --installdir=\"${config.installDirectory}\"`;

        // configure and uninstall it
        await this.onConfigure(target);
        await this._terminal.execute("uninstall", command); 
    }

    // on debug target
    async onDebug(target?: string) {
       
        // this plugin enabled?
        if (!this._enabled) {
            return ;
        }

        /* cpptools externsions not found?
         *
         * see https://github.com/Microsoft/vscode-cpptools
         */
        let extension = vscode.extensions.getExtension("ms-vscode.cpptools"); 
        if (!extension) { 

            // get target name 
            const targetName = this._option.get<string>("target");
            
            // make command
            let command = "xmake r -d";
            if (targetName && targetName != "default")
                command += ` ${targetName}`;

            // configure and debug it
            await this.onConfigure(target);
            await this._terminal.execute("debug", command); 
            return ;
        }

        // active cpptools externsions
        if (!extension.isActive) {
            extension.activate();
        }

        // option changed?
        if (this._optionChanged) {
            await vscode.window.showErrorMessage('Configuration have been changed, please rebuild program first!');
            return ;
        }
 
        // get target name 
        var targetName = this._option.get<string>("target");
        if (!targetName) targetName = "default";

        // get target program 
        var targetProgram = null;
        let getTargetPathScript = path.join(__dirname, `../../assets/targetpath.lua`);
        if (fs.existsSync(getTargetPathScript)) {
            targetProgram = (await process.iorunv("xmake", ["l", getTargetPathScript, targetName], {"COLORTERM": "nocolor"}, config.workingDirectory)).stdout.trim();
            if (targetProgram) {
                targetProgram = targetProgram.split('\n')[0].trim();
            }
        }

        // start debugging
        if (targetProgram && fs.existsSync(targetProgram)) {
            this._debugger.startDebugging(targetName, targetProgram);
        } else {
            await vscode.window.showErrorMessage('The target program not found!');
        }
    }

    // on macro begin
    async onMacroBegin(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // begin marco
        await this._terminal.execute("macro begin", "xmake m -b");

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
        await this._terminal.execute("macro end", "xmake m -e");

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
        await this._terminal.execute("macro run", "xmake m .");
    }

    // on run last command
    async onRunLastCommand(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // end marco
        await this._terminal.execute("macro run last", "xmake m ..");
    }

    // set project root directory
    async setProjectRoot(target?: string) {
        
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // no projects?
        if (!vscode.workspace.workspaceFolders || !vscode.workspace.workspaceFolders.length) {
            return;
        }
    
        // select projects
        let items: vscode.QuickPickItem[] = [];
        vscode.workspace.workspaceFolders.forEach(workspaceFolder => {
            items.push({label: workspaceFolder.name, description: workspaceFolder.uri.fsPath});
        });      
        const chosen: vscode.QuickPickItem|undefined = await vscode.window.showQuickPick(items);
        if (chosen && chosen.label !== this._option.get<string>("project")) {

            // update project
            this._option.set("project", chosen.label);
            utils.setProjectRoot(chosen.description);
            this._status.project = chosen.label;
            this._optionChanged = true;

            // reload cache in new project root
            this.loadCache();
        }
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
                arch = (plat == "windows"? "x86" : {x64: 'x86_64', x86: 'i386'}[os.arch()]);
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
            items.push({label: "armv7-a", description: "The armv7-a Architecture"});
            items.push({label: "arm64-v8a", description: "The arm64-v8a Architecture"});
            items.push({label: "i386", description: "The i386 Architecture"});
            items.push({label: "x86_64", description: "The x86_64 Architecture"});
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
        let targets = "";
        let getTargetsPathScript = path.join(__dirname, `../../assets/targets.lua`);
        if (fs.existsSync(getTargetsPathScript)) {
            targets = (await process.iorunv("xmake", ["l", getTargetsPathScript], {"COLORTERM": "nocolor"}, config.workingDirectory)).stdout.trim();
            if (targets) {
                targets = targets.split("__end__")[0].trim();
            }
        }

        // select target
        let items: vscode.QuickPickItem[] = [];
        items.push({label: "default", description: "All Default Targets"});
        items.push({label: "all", description: "All Targets"});
        if (targets) {
            targets.split('\n').forEach(element => {
                element = element.trim();
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
