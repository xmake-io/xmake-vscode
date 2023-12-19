'use strict';

// imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { log } from './log';
import { config } from './config';
import { Terminal } from './terminal';
import { Status } from './status';
import { Option } from './option';
import { ProblemList } from './problem';
import { Debugger } from './debugger';
import { initDebugger } from './launchDebugger';
import { Completion } from './completion';
import { XmakeTaskProvider } from './task';
import { XMakeExplorer } from './explorer';
import * as process from './process';
import * as utils from './utils';
import * as diagnosis from './diagnosis';

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

    // the log file watcher
    private _logFileSystemWatcher: vscode.FileSystemWatcher;

    // the config file watcher
    private _configFileSystemWatcher: vscode.FileSystemWatcher;
    private _configFileUpdateLastTime = Date.now();

    // the project file watcher
    private _projectFileSystemWatcher: vscode.FileSystemWatcher;
    private _projectFileUpdateLastTime = Date.now();

    // the xmake task provider
    private _xmakeTaskProvider: vscode.Disposable | undefined;

    // the xmake explorer
    private _xmakeExplorer: XMakeExplorer;

    private _xmakeDiagnosticCollection: vscode.DiagnosticCollection;

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
        if (this._terminal) {
            this._terminal.dispose();
        }
        if (this._status) {
            this._status.dispose();
        }
        if (this._option) {
            this._option.dispose();
        }
        if (this._problems) {
            this._problems.dispose();
        }
        if (this._debugger) {
            this._debugger.dispose();
        }
        if (this._logFileSystemWatcher) {
            this._logFileSystemWatcher.dispose();
        }
        if (this._configFileSystemWatcher) {
            this._configFileSystemWatcher.dispose();
        }
        if (this._projectFileSystemWatcher) {
            this._projectFileSystemWatcher.dispose();
        }
        if (this._xmakeTaskProvider) {
            this._xmakeTaskProvider.dispose();
        }
        if (this._xmakeExplorer) {
            this._xmakeExplorer.dispose();
        }
        if (this._xmakeDiagnosticCollection) {
            this._xmakeDiagnosticCollection.dispose();
        }
    }

    private async runListingScript(script: string, ...args): Promise<string[] | undefined> {
        if (fs.existsSync(script)) {
            let result = (await process.iorunv(config.executable, ["l", script, ...args], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
            if (result) {
                result = result.split("__end__")[0].trim();
                return result.split("\n");
            } else {
                log.error(`runListingScript: script \`${script}\` return empty`);
            }
        } else {
            log.error(`runListingScript: script \`${script}\` not found`);
        }
    }

    private async listArchs(plat: string): Promise<string[]> {
        let getArchsScript = path.join(__dirname, `../../assets/archs.lua`);
        return await this.runListingScript(getArchsScript, plat);
    }

    private async listPlats(): Promise<string[]> {
        let getPlatsScript = path.join(__dirname, `../../assets/plats.lua`);
        return await this.runListingScript(getPlatsScript);
    }

    // get default arch from platform
    public async getDefaultArch(plat: string): Promise<string> {
        let arch = "";
        const host = { win32: 'windows', darwin: 'macosx', linux: 'linux' }[os.platform()];
        const default_archs = {
            windows: "x86_64", macosx: "x86_64", linux: "x86_64", mingw: "x86_64",
            iphoneos: "arm64", watchos: "armv7k", android: "arm64-v8a", wasm: "wasm32"
        };
        if (plat == host) {
            if (plat == "windows") {
                arch = { x64: 'x64', x86: 'x86', arm64: 'arm64' }[os.arch()];
            } else {
                arch = { x64: 'x86_64', x86: 'i386', arm64: 'arm64', aarch64: "arm64" }[os.arch()];
            }
        } else {
            if (plat in default_archs) {
                arch = default_archs[plat];
            } else {
                const available_archs = await this.listArchs(plat);
                if (available_archs.length > 0) {
                    arch = available_archs[0];
                } else {
                    log.error(`getDefaultArch: default arch not found for platform \`${plat}\``);
                }
            }
        }
        return arch;
    }

    // load cache
    async loadCache() {

        // load config cache
        let cacheJson = {}
        let getConfigPathScript = path.join(__dirname, `../../assets/config.lua`);
        if (fs.existsSync(getConfigPathScript)) {
            let configs = (await process.iorunv(config.executable, ["l", getConfigPathScript], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
            if (configs) {
                configs = configs.split('__end__')[0].trim();
                cacheJson = JSON.parse(configs);
            }
        }

        // init platform
        const plat = ("plat" in cacheJson && cacheJson["plat"] != "") ? cacheJson["plat"] : { win32: 'windows', darwin: 'macosx', linux: 'linux' }[os.platform()];
        if (plat) {
            this._option.set("plat", plat);
            this._status.plat = plat;
        }

        // init architecture
        const arch = ("arch" in cacheJson && cacheJson["arch"] != "") ? cacheJson["arch"] : await this.getDefaultArch(plat);
        if (arch) {
            this._option.set("arch", arch);
            this._status.arch = arch as string;
        }

        // init build mode
        const mode = ("mode" in cacheJson && cacheJson["mode"] != "") ? cacheJson["mode"] : "debug";
        this._option.set("mode", mode);
        this._status.mode = mode as string;

        // init defaualt toolchain
        const toolchain = "toolchain";
        this._option.set("toolchain", toolchain);
        this._status.toolchain = toolchain;
    }

    // update Intellisense
    async updateIntellisense() {
        log.verbose("updating Intellisense ..");
        let updateIntellisenseScript = path.join(__dirname, `../../assets/update_intellisense.lua`);
        if (fs.existsSync(updateIntellisenseScript)) {
            await process.runv(config.executable, ["l", updateIntellisenseScript, config.compileCommandsDirectory], { "COLORTERM": "nocolor" }, config.workingDirectory);
        }
    }

    // update Diagnosis
    async updateDiagnosis(affectedPath: vscode.Uri | undefined) {
        if (!config.enableSyntaxCheck) return;
        if (!diagnosis.isEligible(affectedPath?.fsPath)) {
            return;
        }

        log.verbose("updating Diagnosis ..");
        const result = await process.runv(config.executable, ["check"], { "COLORTERM": "nocolor" }, config.workingDirectory);
        const diags = diagnosis.parse(result.stdout ?? result.stderr);
        this._xmakeDiagnosticCollection.clear();
        for (const file in diags) {
            const uri = vscode.Uri.file(path.join(config.workingDirectory, file));
            this._xmakeDiagnosticCollection.set(uri, diags[file]);
        }
    }

    // init watcher
    async initWatcher() {

        // init log file system watcher
        this._logFileSystemWatcher = vscode.workspace.createFileSystemWatcher(".xmake/**/vscode-build.log");
        this._logFileSystemWatcher.onDidCreate(this.onLogFileUpdated.bind(this));
        this._logFileSystemWatcher.onDidChange(this.onLogFileUpdated.bind(this));
        this._logFileSystemWatcher.onDidDelete(this.onLogFileDeleted.bind(this));

        // init config file system watcher
        this._configFileSystemWatcher = vscode.workspace.createFileSystemWatcher(".xmake/xmake.conf");
        this._configFileSystemWatcher.onDidCreate(this.onConfigFileUpdated.bind(this));
        this._configFileSystemWatcher.onDidChange(this.onConfigFileUpdated.bind(this));

        // init project file system watcher
        this._projectFileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/xmake.lua");
        this._projectFileSystemWatcher.onDidCreate(this.onProjectFileUpdated.bind(this));
        this._projectFileSystemWatcher.onDidChange(this.onProjectFileUpdated.bind(this));

        this._context.subscriptions.push(
            vscode.workspace.onDidCreateFiles((e: vscode.FileCreateEvent) => {
                this._xmakeExplorer.refresh();
            })
        );

        this._context.subscriptions.push(
            vscode.workspace.onDidDeleteFiles((e: vscode.FileDeleteEvent) => {
                this._xmakeExplorer.refresh();
            })
        );

        // update Diagnosis when file is opened
        this._context.subscriptions.push(
            vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor | undefined) => {
                this.updateDiagnosis(e?.document.uri);
            })
        );

        // initial opened file
        if (vscode.window.activeTextEditor) {
            this.updateDiagnosis(vscode.window.activeTextEditor.document.uri);
        }
    }

    // refresh folder
    async refreshFolder() {

        // wait some times
        await utils.sleep(2000);

        // refresh it
        vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
    }

    // on Config File Updated
    async onConfigFileUpdated(affectedPath: vscode.Uri) {

        /* avoid frequent trigger events
         * https://github.com/xmake-io/xmake-vscode/issues/78
        */
        let now = Date.now();
        if (now - this._configFileUpdateLastTime < 1000) {
            return;
        }
        this._configFileUpdateLastTime = now;

        // update configure cache
        let filePath = affectedPath.fsPath;
        if (filePath.includes("xmake.conf")) {
            log.verbose("onConfigFileUpdated: " + affectedPath.fsPath);
            this.loadCache();
            this._xmakeExplorer.refresh();
        }
    }

    // on Project File Updated
    async onProjectFileUpdated(affectedPath: vscode.Uri) {

        /* avoid frequent trigger events
         * https://github.com/xmake-io/xmake-vscode/issues/78
        */
        let now = Date.now();
        if (now - this._projectFileUpdateLastTime < 2000) {
            return;
        }
        this._projectFileUpdateLastTime = now;

        // update project cache
        let filePath = affectedPath.fsPath;
        if (filePath.includes("xmake.lua") && !filePath.includes(".xmake")) {
            log.verbose("onProjectFileUpdated: " + affectedPath.fsPath);
            this.loadCache();
            this.updateIntellisense();
            this._xmakeExplorer.refresh();
        }

        // update diagnosis info
        this.updateDiagnosis(affectedPath);
    }

    // on Log File Updated
    async onLogFileUpdated(affectedPath: vscode.Uri) {
        let filePath = affectedPath.fsPath;
        if (filePath.includes("vscode-build.log")) {
            log.verbose("onLogFileUpdated: " + affectedPath.fsPath);
            this._problems.diagnose(filePath);
        }
    }

    // on Log File Delete
    async onLogFileDeleted(affectedPath: vscode.Uri) {

        // trace
        log.verbose("onLogFileDeleted: " + affectedPath.fsPath);

        // wait some times
        await utils.sleep(2000);

        // clear problems
        let filePath = affectedPath.fsPath;
        if (filePath.includes("vscode-build.log")) {
            this._problems.clear();
        }
    }

    // start plugin
    async startPlugin() {

        // has been enabled?
        if (this._enabled) {
            return;
        }

        // init languages
        vscode.languages.registerCompletionItemProvider("xmake", new Completion());

        // register xmake task provider
        this._xmakeTaskProvider = vscode.tasks.registerTaskProvider(XmakeTaskProvider.XmakeType, new XmakeTaskProvider(utils.getProjectRoot()));

        // explorer
        this._xmakeExplorer = new XMakeExplorer();
        await this._xmakeExplorer.init(this._context);

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

        // init diagnostic collection
        this._xmakeDiagnosticCollection = vscode.languages.createDiagnosticCollection("xmake");

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

        initDebugger(this._context, this._option);

        vscode.commands.executeCommand('setContext', 'xmakeEnabled', true);
    }

    // create project
    async createProject() {

        // select language
        let getLanguagesScript = path.join(__dirname, `../../assets/languages.lua`);
        let gettemplatesScript = path.join(__dirname, `../../assets/templates.lua`);
        if (fs.existsSync(getLanguagesScript) && fs.existsSync(gettemplatesScript)) {
            let result = (await process.iorunv(config.executable, ["l", getLanguagesScript], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
            if (result) {
                let items: vscode.QuickPickItem[] = [];
                result.split("\n").forEach(element => {
                    items.push({ label: element.trim(), description: "" });
                });
                const chosen: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items);
                if (chosen) {

                    // select template
                    let result2 = (await process.iorunv(config.executable, ["l", gettemplatesScript, chosen.label], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
                    if (result2) {
                        let items2: vscode.QuickPickItem[] = [];
                        result2.split("\n").forEach(element => {
                            items2.push({ label: element.trim(), description: "" });
                        });
                        const chosen2: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items2);
                        if (chosen2) {

                            // create project
                            if (!this._terminal) {
                                this._terminal = new Terminal();
                            }
                            await this._terminal.exec("create", `${config.executable} create -t ${chosen2.label} -l ${chosen.label} -P "${config.workingDirectory}"`, false);

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
            return;
        }

        // trace
        log.verbose(`start in ${config.workingDirectory}`);

        // check xmake
        if (0 != (await process.runv(config.executable, ["--version"], { "COLORTERM": "nocolor" }, config.workingDirectory)).retval) {
            return;
        }

        // valid xmake project?
        if (!fs.existsSync(path.join(config.workingDirectory, "xmake.lua"))) {
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

        vscode.commands.executeCommand('setContext', 'xmakeEnabled', false);
    }

    // on create project
    async onCreateProject(target?: string) {
        this.createProject();
    }

    // on new files
    async onNewFiles(target?: string) {

        if (!this._enabled) {
            return;
        }

        // select files
        let getFilesListScript = path.join(__dirname, `../../assets/newfiles.lua`);
        if (fs.existsSync(getFilesListScript) && fs.existsSync(getFilesListScript)) {
            let result = (await process.iorunv(config.executable, ["l", getFilesListScript], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
            if (result) {
                let items: vscode.QuickPickItem[] = [];
                result.split("\n").forEach(element => {
                    items.push({ label: element.trim(), description: "" });
                });
                const chosen: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items);
                if (chosen) {
                    let filesdir = path.join(__dirname, "..", "..", "assets", "newfiles", chosen.label);
                    if (fs.existsSync(filesdir)) {

                        // copy files
                        await process.runv(config.executable, ["l", "os.cp", path.join(filesdir, "*"), config.workingDirectory], { "COLORTERM": "nocolor" }, config.workingDirectory);

                        // refresh folder
                        await this.refreshFolder();
                    }
                }
            }
        }

        this._xmakeExplorer.refresh();
    }
    async configure(force): Promise<boolean> {
        // this plugin enabled?
        if (!this._enabled) {
            return false;
        }

        // option changed?
        if (force || this._optionChanged) {

            // get the target platform
            let plat = this._option.get<string>("plat");

            // get the target architecture
            let arch = this._option.get<string>("arch");

            // get the build mode
            let mode = this._option.get<string>("mode");

            // get the toolchain
            let toolchain = this._option.get<string>("toolchain");

            // make command
            let command = config.executable
            var args = ["f", "-p", `${plat}`, "-a", `${arch}`, "-m", `${mode}`];
            if (this._option.get<string>("plat") == "android" && config.androidNDKDirectory != "") {
                args.push(`--ndk=${config.androidNDKDirectory}`);
            }
            if (config.QtDirectory != "") {
                args.push(`--qt=${config.QtDirectory}`);
            }
            if (config.WDKDirectory != "") {
                args.push(`--wdk=${config.WDKDirectory}`);
            }
            if (config.buildDirectory != "") {
                // https://github.com/xmake-io/xmake/issues/3449
                let buildDirectory = path.normalize(config.buildDirectory);
                if (buildDirectory != path.join(utils.getProjectRoot(), "build")) {
                    args.push("-o");
                    args.push(buildDirectory);
                }
            }
            if (config.additionalConfigArguments) {
                for (let arg of config.additionalConfigArguments) {
                    args.push(arg);
                }
            }
            if (toolchain != "toolchain") {
                args.push("--toolchain=" + toolchain);
            }
            if (force) {
                args.push("-c");
            }

            // configure it
            await this._terminal.execv("config", command, args);

            // mark as not changed
            this._optionChanged = false;
            return true;
        }
        return false;
    }

    // on configure project
    async onConfigure(target?: string): Promise<boolean> {
        return this.configure(false);
    }

    // on force configure project
    async onForceConfigure(target?: string): Promise<boolean> {
        return this.configure(true);
    }

    // on clean configure project
    async onCleanConfigure(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // make command
        let command = config.executable;
        var args = ["f", "-c"];
        if (config.buildDirectory != "") {
            let buildDirectory = path.normalize(config.buildDirectory);
            if (buildDirectory != path.join(utils.getProjectRoot(), "build")) {
                args.push("-o");
                args.push(buildDirectory);
            }
        }
        if (config.additionalConfigArguments) {
            for (let arg of config.additionalConfigArguments) {
                args.push(arg);
            }
        }

        // configure it
        await this._terminal.execv("clean config", command, args);

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
        let args = [];
        const targetName = this._option.get<string>("target");
        const buildLevel = config.get<string>("buildLevel");
        let command = config.executable;
        if (targetName && targetName != "default") {
            args.push("build");
        }
        if (buildLevel == "verbose") {
            args.push("-v");
        } else if (buildLevel == "warning") {
            args.push("-w");
        } else if (buildLevel == "debug") {
            args.push("-vD");
        }

        // add build target to command
        if (targetName && targetName == "all") {
            args.push("-a");
        } else if (targetName && targetName != "default") {
            args.push(targetName);
        }

        // configure and build it
        await this.onConfigure(target);
        await this._terminal.execv("build", command, args);
    }
    async onBuildAll(target?: string) {
        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // add build level to command
        let args = [];
        const buildLevel = config.get<string>("buildLevel");
        let command = config.executable;
        if (buildLevel == "verbose") {
            args.push("-v");
        } else if (buildLevel == "warning") {
            args.push("-w");
        } else if (buildLevel == "debug") {
            args.push("-vD");
        }
        args.push("--all");

        // configure and build it
        await this.onConfigure(target);
        await this._terminal.execv("build", command, args);
    }

    // on rebuild project
    async onRebuild(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // add build level to command
        let args = ["-r"];
        const buildLevel = config.get<string>("buildLevel");
        let command = config.executable;
        if (buildLevel == "verbose") {
            args.push("-v");
        } else if (buildLevel == "warning") {
            args.push("-w");
        } else if (buildLevel == "debug") {
            args.push("-vD");
        }

        // add build target to command
        const targetName = this._option.get<string>("target");
        if (targetName && targetName != "default") {
            args.push(targetName);
        } else if (targetName == "all") {
            args.push("-a");
        }

        // configure and rebuild it
        await this.onConfigure(target);
        await this._terminal.execv("rebuild", command, args);
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
        let command = `${config.executable} c`;
        if (targetName && targetName != "default")
            command += ` ${targetName}`;

        // configure and clean it
        await this.onConfigure(target);
        await this._terminal.exec("clean", command);
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
        let command = `${config.executable} c -a`;
        if (targetName && targetName != "default")
            command += ` ${targetName}`;

        // configure and clean all
        await this.onConfigure(target);
        await this._terminal.exec("clean all", command);

        // mark as changed, so that next `onConfigure` will be executed
        this._optionChanged = true;
    }

    // on run target
    async onBuildRun(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // get target name
        let targetName = this._option.get<string>("target");
        if (!targetName) {
            let getDefaultTargetPathScript = path.join(__dirname, `../../assets/default_target.lua`);
            if (fs.existsSync(getDefaultTargetPathScript)) {
                let result = (await process.iorunv(config.executable, ["l", getDefaultTargetPathScript], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
                if (result) {
                    targetName = result.split('__end__')[0].trim();
                }
            }
        }

        // get target arguments
        let args = ["run"];
        let configArgs = [];
        if (targetName && targetName in config.runningTargetsArguments)
            configArgs = config.runningTargetsArguments[targetName];
        else if ("default" in config.runningTargetsArguments)
            configArgs = config.runningTargetsArguments["default"];

        // make command
        let command = config.executable;
        if (targetName && targetName != "default") {
            args.push(targetName);
            for (let arg of configArgs) {
                args.push(arg);
            }
        } else if (targetName == "all") {
            args.push("-a");
        } else {
            for (let arg of configArgs) {
                args.push(arg);
            }
        }

        // build and run it
        await this.onBuild(target);
        await this._terminal.execv("run", command, args);
    }

    // on run target
    async onRun(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // build and run?
        const runMode = config.get<string>("runMode");
        if (runMode == "buildRun") {
            return this.onBuildRun(target)
        }

        // get target name
        let targetName = this._option.get<string>("target");
        if (!targetName) {
            let getDefaultTargetPathScript = path.join(__dirname, `../../assets/default_target.lua`);
            if (fs.existsSync(getDefaultTargetPathScript)) {
                let result = (await process.iorunv(config.executable, ["l", getDefaultTargetPathScript], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
                if (result) {
                    targetName = result.split('__end__')[0].trim();
                }
            }
        }

        // get target arguments
        let args = ["run"];
        let configArgs = [];
        if (targetName && targetName in config.runningTargetsArguments)
            configArgs = config.runningTargetsArguments[targetName];
        else if ("default" in config.runningTargetsArguments)
            configArgs = config.runningTargetsArguments["default"];

        // make command
        let command = config.executable;
        if (targetName && targetName != "default") {
            args.push(targetName);
            for (let arg of configArgs) {
                args.push(arg);
            }
        } else if (targetName == "all") {
            args.push("-a");
        } else {
            for (let arg of configArgs) {
                args.push(arg);
            }
        }

        // configure and run it
        await this.onConfigure(target);
        await this._terminal.execv("run", command, args);
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
        let command = `${config.executable} p`;
        if (targetName && targetName != "default")
            command += ` ${targetName}`;
        else if (targetName == "all")
            command += " -a";

        // configure and package it
        await this.onConfigure(target);
        await this._terminal.exec("package", command);
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
        let args = ["install"];
        let command = config.executable;
        if (targetName && targetName != "default") {
            args.push(targetName);
        } else if (targetName == "all") {
            args.push("-a");
        }
        if (config.installDirectory != "") {
            args.push("-o");
            args.push(config.installDirectory);
        }

        // configure and install it
        await this.onConfigure(target);
        await this._terminal.execv("install", command, args);
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
        let args = ["uninstall"];
        let command = config.executable;
        if (targetName && targetName != "default") {
            args.push(targetName);
        }
        if (config.installDirectory != "") {
            args.push(`--installdir=${config.installDirectory}`);
        }

        // configure and uninstall it
        await this.onConfigure(target);
        await this._terminal.execv("uninstall", command, args);
    }

    // on debug target
    async onDebug(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return;
        }

        /* cpptools or codelldb externsions not found?
         *
         * @see
         * https://github.com/Microsoft/vscode-cpptools
         * https://github.com/vadimcn/vscode-lldb
         */
        var extension = null;
        if (os.platform() == "darwin" || config.debugConfigType == "codelldb") {
            extension = vscode.extensions.getExtension("vadimcn.vscode-lldb");
        }
        if (!extension) {
            extension = vscode.extensions.getExtension("ms-vscode.cpptools");
        }
        if (!extension) {

            // get target name
            const targetName = this._option.get<string>("target");

            // make command
            let command = `${config.executable} r -d`;
            if (targetName && targetName != "default")
                command += ` ${targetName}`;

            // configure and debug it
            await this.onConfigure(target);
            await this._terminal.exec("debug", command);
            return;
        }

        // active cpptools/codelldb externsions
        if (!extension.isActive) {
            extension.activate();
        }

        // option changed?
        if (this._optionChanged) {
            await vscode.window.showErrorMessage('Configuration have been changed, please rebuild program first!');
            return;
        }

        // get target name
        var targetName = this._option.get<string>("target");
        if (!targetName) targetName = "default";

        // get target program
        var targetProgram = null;
        let getTargetPathScript = path.join(__dirname, `../../assets/targetpath.lua`);
        if (fs.existsSync(getTargetPathScript)) {
            targetProgram = (await process.iorunv(config.executable, ["l", getTargetPathScript, targetName], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
            if (targetProgram) {
                targetProgram = targetProgram.split("__end__")[0].trim();
                targetProgram = targetProgram.split('\n')[0].trim();
            }
        }

        // get target run directory
        var targetRunDir = null;
        let getTargetRunDirScript = path.join(__dirname, `../../assets/target_rundir.lua`);
        if (fs.existsSync(getTargetRunDirScript)) {
            targetRunDir = (await process.iorunv(config.executable, ["l", getTargetRunDirScript, targetName], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
            if (targetRunDir) {
                targetRunDir = targetRunDir.split("__end__")[0].trim();
                targetRunDir = targetRunDir.split('\n')[0].trim();
            }
        }

        // get target run envs
        var targetRunEnvs = null;
        let getTargetRunEnvsScript = path.join(__dirname, `../../assets/target_runenvs.lua`);
        if (fs.existsSync(getTargetRunEnvsScript)) {
            targetRunEnvs = (await process.iorunv(config.executable, ["l", getTargetRunEnvsScript, targetName], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
            if (targetRunEnvs) {
                targetRunEnvs = targetRunEnvs.split("__end__")[0].trim();
                targetRunEnvs = targetRunEnvs.split('\n')[0].trim();
            }
            if (targetRunEnvs) {
                targetRunEnvs = JSON.parse(targetRunEnvs);
            } else {
                targetRunEnvs = null;
            }
        }

        // get platform
        var plat = this._option.get<string>("plat");
        if (!plat) plat = "default";

        // start debugging
        if (targetProgram && fs.existsSync(targetProgram)) {
            this._debugger.startDebugging(targetName, targetProgram, targetRunDir, targetRunEnvs, plat);
        } else {
            await vscode.window.showErrorMessage('The target program not found!');
        }
    }

    // on launch debug target
    async onLaunchDebug(target?: string) {
        // this plugin enabled?
        if (!this._enabled) {
            return;
        }

        /* cpptools or codelldb externsions not found?
         *
         * @see
         * https://github.com/Microsoft/vscode-cpptools
         * https://github.com/vadimcn/vscode-lldb
         */
        let extension = null;
        if (os.platform() == "darwin" || config.debugConfigType == "codelldb") {
            extension = vscode.extensions.getExtension("vadimcn.vscode-lldb");
        }
        if (!extension) {
            extension = vscode.extensions.getExtension("ms-vscode.cpptools");
        }
        if (!extension) {

            // get target name
            const targetName = this._option.get<string>("target");

            // make command
            let command = `${config.executable} r -d`;
            if (targetName && targetName != "default")
                command += ` ${targetName}`;

            // configure and debug it
            await this.onConfigure(target);
            await this._terminal.exec("debug", command);
            return;
        }

        // active cpptools/codelldb externsions
        if (!extension.isActive) {
            extension.activate();
        }

        // option changed?
        if (this._optionChanged) {
            await vscode.window.showErrorMessage('Configuration have been changed, please rebuild program first!');
            return;
        }

        // get target name
        let targetName = this._option.get<string>("target");
        if (!targetName) targetName = "default";

        // start debugging
        const name = `Debug: ${targetName}`;
        const debugConfig = { name: name, type: 'xmake', request: 'launch', target: targetName, stopAtEntry: true };
        await vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], debugConfig);
    }

    // on macro begin
    async onMacroBegin(target?: string) {
        if (this._enabled) {
            await this._terminal.exec("macro begin", `${config.executable} m -b`);
            this._status.startRecord();
        }
    }

    // on macro end
    async onMacroEnd(target?: string) {
        if (this._enabled) {
            await this._terminal.exec("macro end", `${config.executable} m -e`);
            this._status.stopRecord();
        }
    }

    // on macro run
    async onMacroRun(target?: string) {
        if (this._enabled) {
            await this._terminal.exec("macro run", `${config.executable} m .`);
        }
    }

    // on run last command
    async onRunLastCommand(target?: string) {
        if (this._enabled) {
            await this._terminal.exec("macro run last", `${config.executable} m ..`);
        }
    }

    // on update intellisense
    async onUpdateIntellisense(target?: string) {
        if (this._enabled) {
            await this.updateIntellisense();
        }
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
            items.push({ label: workspaceFolder.name, description: workspaceFolder.uri.fsPath });
        });
        const chosen: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items);
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

        const plats = await this.listPlats();
        if (plats) {
            plats.forEach(element => {
                items.push({ label: element.trim(), description: "The " + element.trim() + " Platform" });
            });
            const chosen: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items);
            if (chosen && chosen.label !== this._option.get<string>("plat")) {
                // update platform
                this._option.set("plat", chosen.label);
                this._status.plat = chosen.label;
                this._optionChanged = true;

                // update architecture
                let plat = chosen.label;
                let arch = await this.getDefaultArch(plat);
                if (arch && arch != "") {
                    this._option.set("arch", arch);
                    this._status.arch = arch;
                }
            }
        }
    }

    // set target toolchain
    async setTargetToolchain(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        var tools;
        let getToolchainsPathScript = path.join(__dirname, `../../assets/toolchains.lua`);
        if (fs.existsSync(getToolchainsPathScript)) {
            tools = JSON.parse((await process.iorunv(config.executable, ["l", getToolchainsPathScript, config.workingDirectory])).stdout.trim());
        }
        if (!tools) {
            return
        }

        // select toolchain
        let items: vscode.QuickPickItem[] = [];
        items.push({ label: "toolchain", description: "default toolchain for each platform or arch" })
        for (var i = 0; i < tools.length; i++) {
            items.push({ label: tools[i][0], description: tools[i][1] });
        }

        const chosen: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items);
        if (chosen && chosen.label !== this._option.get<string>("toolchain")) {
            // update compiler
            this._option.set("toolchain", chosen.label);
            this._optionChanged = true;
            this._status.toolchain = chosen.label;
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

        // select archs
        let archs = await this.listArchs(plat);
        if (archs) {
            archs.forEach(element => {
                items.push({ label: element.trim(), description: "The " + element.trim() + " architecture" });
            });
            const chosen: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items);
            if (chosen && chosen.label !== this._option.get<string>("arch")) {
                this._option.set("arch", chosen.label);
                this._status.arch = chosen.label;
                this._optionChanged = true;
            }
        }
    }

    // set build mode
    async setBuildMode(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return
        }

        // select mode
        let getModeListScript = path.join(__dirname, `../../assets/modes.lua`);
        if (fs.existsSync(getModeListScript) && fs.existsSync(getModeListScript)) {
            let result = (await process.iorunv(config.executable, ["l", getModeListScript], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
            if (result) {
                let items: vscode.QuickPickItem[] = [];
                result = result.split("__end__")[0].trim();
                result.split("\n").forEach(element => {
                    items.push({ label: element.trim(), description: "The " + element.trim() + " mode" });
                });
                const chosen: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items);
                if (chosen && chosen.label !== this._option.get<string>("mode")) {
                    this._option.set("mode", chosen.label);
                    this._status.mode = chosen.label;
                    this._optionChanged = true;
                }
            }
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
            targets = (await process.iorunv(config.executable, ["l", getTargetsPathScript], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
            if (targets) {
                targets = targets.split("__end__")[0].trim();
            }
        }

        // select target
        let items: vscode.QuickPickItem[] = [];
        items.push({ label: "default", description: "All Default Targets" });
        items.push({ label: "all", description: "All Targets" });
        if (targets) {
            let targetlist = JSON.parse(targets);
            if (targetlist) {
                targetlist.forEach(element => {
                    element = element.trim();
                    if (element.length > 0)
                        items.push({ label: element, description: "The Project Target: " + element });
                });
            }
        }
        const chosen: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items);
        if (chosen && chosen.label !== this._option.get<string>("target")) {
            this._option.set("target", chosen.label);
            this._status.target = chosen.label;
        }
    }

    async setTarget(target?: string) {
        this._option.set("target", target);
        this._status.target = target;
    }
};
