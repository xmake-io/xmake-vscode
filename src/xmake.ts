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
import { Completion } from './completion';
import { XmakeTaskProvider } from './task';
import { XMakeExplorer } from './explorer';
import * as process from './process';
import * as utils from './utils';
import { initDebugger } from './debugger';

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

    // the log file watcher
    private _logFileSystemWatcher: vscode.FileSystemWatcher;

    // the config file watcher
    private _configFileSystemWatcher: vscode.FileSystemWatcher;

    // the project file watcher
    private _projectFileSystemWatcher: vscode.FileSystemWatcher;

    // the xmake task provider
    private _xmakeTaskProvider: vscode.Disposable | undefined;

    private _xmakeExplorer: XMakeExplorer;

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
            this._status.plat = plat as string;
        }

        // init architecture
        const arch = ("arch" in cacheJson && cacheJson["arch"] != "") ? cacheJson["arch"] : (plat == "windows" ? "x86" : { x64: 'x86_64', x86: 'i386' }[os.arch()]);
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
        this._status.toolchain = toolchain as string;
    }

    // update Intellisense
    async updateIntellisense() {
        log.verbose("updating Intellisense ..");
        let updateIntellisenseScript = path.join(__dirname, `../../assets/update_intellisense.lua`);
        if (fs.existsSync(updateIntellisenseScript)) {
            await process.runv(config.executable, ["l", updateIntellisenseScript, config.compileCommandsDirectory], { "COLORTERM": "nocolor" }, config.workingDirectory);
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

        // trace
        log.verbose("onConfigFileUpdated: " + affectedPath.fsPath);

        // update configure cache
        let filePath = affectedPath.fsPath;
        if (filePath.includes("xmake.conf")) {
            this.loadCache();
            this._xmakeExplorer.refresh();
        }
    }

    // on Project File Updated
    async onProjectFileUpdated(affectedPath: vscode.Uri) {

        // trace
        log.verbose("onProjectFileUpdated: " + affectedPath.fsPath);

        // wait some times
        await utils.sleep(2000);

        // update project cache
        let filePath = affectedPath.fsPath;
        if (filePath.includes("xmake.lua")) {
            this.loadCache();
            this.updateIntellisense();
            this._xmakeExplorer.refresh();
        }
    }

    // on Log File Updated
    async onLogFileUpdated(affectedPath: vscode.Uri) {

        // trace
        log.verbose("onLogFileUpdated: " + affectedPath.fsPath);

        // wait some times
        await utils.sleep(2000);

        // update problems
        let filePath = affectedPath.fsPath;
        if (filePath.includes("vscode-build.log")) {
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

        vscode.commands.executeCommand('setContext', 'xmakeEnabled', true);

        initDebugger(this._context, this._option);
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
            if (!!(await vscode.window.showErrorMessage('no opened folder!',
                'Open a xmake project directory first!'))) {
                vscode.commands.executeCommand('vscode.openFolder');
            }
            return;
        }

        // trace
        log.verbose(`start in ${config.workingDirectory}`);

        // check xmake
        if (0 != (await process.runv(config.executable, ["--version"], { "COLORTERM": "nocolor" }, config.workingDirectory)).retval) {
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

        vscode.commands.executeCommand('setContext', 'xmakeEnabled', false);
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
            if (config.buildDirectory != "" && config.buildDirectory != path.join(utils.getProjectRoot(), "build")) {
                args.push("-o");
                args.push(config.buildDirectory);
            }
            if (config.additionalConfigArguments) {
                for (let arg of config.additionalConfigArguments) {
                    args.push(arg);
                }
            }
            if (toolchain != "toolchain") {
                args.push("--toolchain=" + toolchain);
            }

            // configure it
            await this._terminal.execv("config", command, args);

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
        let command = config.executable;
        var args = ["f", "-c"];
        if (config.buildDirectory != "" && config.buildDirectory != path.join(utils.getProjectRoot(), "build")) {
            args.push("-o");
            args.push(config.buildDirectory);
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
        if (targetName && targetName != "default") {
            args.push(targetName);
        } else if (targetName == "all") {
            args.push("-a");
        }

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

    async onDebug(target?: string) {

        // this plugin enabled?
        if (!this._enabled) {
            return;
        }

        let targetName = this._option.get<string>("target");
        if (!targetName) {
            let getDefaultTargetPathScript = path.join(__dirname, `../../assets/default_target.lua`);
            if (fs.existsSync(getDefaultTargetPathScript)) {
                let result = (await process.iorunv(config.executable, ["l", getDefaultTargetPathScript], {"COLORTERM": "nocolor"}, config.workingDirectory)).stdout.trim();
                if (result) {
                    targetName = result.split('__end__')[0].trim();
                }
            }
        }

        const name = `Debug: ${targetName}`;
        await vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], { name: name, type: 'xmake', request: 'launch', target: targetName });
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
        items.push({ label: "linux", description: "The Linux Platform" });
        items.push({ label: "macosx", description: "The MacOS Platform" });
        items.push({ label: "windows", description: "The Windows Platform" });
        items.push({ label: "android", description: "The Android Platform" });
        items.push({ label: "iphoneos", description: "The iPhoneOS Platform" });
        items.push({ label: "watchos", description: "The WatchOS Platform" });
        items.push({ label: "mingw", description: "The MingW Platform" });
        items.push({ label: "cross", description: "The Cross Platform" });
        const chosen: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items);
        if (chosen && chosen.label !== this._option.get<string>("plat")) {

            // update platform
            this._option.set("plat", chosen.label);
            this._status.plat = chosen.label;
            this._optionChanged = true;

            // update architecture
            let plat = chosen.label;
            let arch = "";
            const host = { win32: 'windows', darwin: 'macosx', linux: 'linux' }[os.platform()];
            if (plat == host) {
                arch = (plat == "windows" ? "x86" : { x64: 'x86_64', x86: 'i386' }[os.arch()]);
            }
            else {
                arch = { windows: "x86", macosx: "x86_64", linux: "x86_64", mingw: "x86_64", iphoneos: "arm64", watchos: "armv7k", android: "arm64-v8a" }[plat];
            }
            if (arch && arch != "") {
                this._option.set("arch", arch);
                this._status.arch = arch;
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
        let getArchListScript = path.join(__dirname, `../../assets/archs.lua`);
        if (fs.existsSync(getArchListScript) && fs.existsSync(getArchListScript)) {
            let result = (await process.iorunv(config.executable, ["l", getArchListScript, plat], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
            if (result) {
                let items: vscode.QuickPickItem[] = [];
                result = result.split("__end__")[0].trim();
                result.split("\n").forEach(element => {
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
            targets.split('\n').forEach(element => {
                element = element.trim();
                if (element.length > 0)
                    items.push({ label: element, description: "The Project Target: " + element });
            });
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
