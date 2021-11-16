'use strict';

// imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as process from './process';
import { config } from './config';
import { log } from './log';

// Different tree view items contain different data
// Following types store specific info that we should keep in each tree view item

enum XMakeExplorerItemType {
    ROOT,
    GROUP,
    TARGET,
    DIRECTORY,
    FILE,
}

type XMakeExplorerRootInfo = {
    type: XMakeExplorerItemType.ROOT;
}

type XMakeExplorerGroupInfo = {
    type: XMakeExplorerItemType.GROUP;
    group: string[];
}

type XMakeExplorerTargetInfo = {
    type: XMakeExplorerItemType.TARGET;
    group: string[];
    target: string;
    kind: string;
}

type XMakeExplorerDirectoryInfo = {
    type: XMakeExplorerItemType.DIRECTORY;
    group: string[];
    target: string;
    path: string[];
}

type XMakeExplorerFileInfo = {
    type: XMakeExplorerItemType.FILE;
    group: string[];
    target: string;
    path: string[];
}

type XMakeExplorerItemInfo = XMakeExplorerRootInfo | XMakeExplorerGroupInfo | XMakeExplorerTargetInfo | XMakeExplorerDirectoryInfo | XMakeExplorerFileInfo;

// Tree view item
// This stores item specific data and initializes itself to show correct icons and actions

class XMakeExplorerItem extends vscode.TreeItem {

    info: XMakeExplorerItemInfo;

    constructor(public label: string, info: XMakeExplorerItemInfo) {
        super(label, info.type != XMakeExplorerItemType.FILE ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        this.info = info;

        // Set the context value for target items to attach target related commands
        if (info.type == XMakeExplorerItemType.TARGET)
            this.contextValue = "target";

        // Set file open command for file items
        if (info.type == XMakeExplorerItemType.FILE)
            this.command = {
                title: "Open File",
                command: "xmakeExplorer.openFile",
                arguments: [path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, path.join(...info.path))]
            };

        // Set the icon depending on the type
        // Each known file type is assigned a language specific icon
        // If the file type is recognized then the default file icon is assigned

        const resDirPath = [__dirname, "..", "..", "res"];

        switch (info.type) {
            case XMakeExplorerItemType.GROUP:
                this.iconPath = {
                    dark: path.join(...resDirPath, "dark", "symbol-misc.svg"),
                    light: path.join(...resDirPath, "light", "symbol-misc.svg")
                }
                break;
            case XMakeExplorerItemType.TARGET:
                if (info.kind === "binary")
                    this.iconPath = {
                        dark: path.join(...resDirPath, "dark", "window.svg"),
                        light: path.join(...resDirPath, "light", "window.svg")
                    }
                else if (info.kind === "shared")
                    this.iconPath = {
                        dark: path.join(...resDirPath, "dark", "gear.svg"),
                        light: path.join(...resDirPath, "light", "gear.svg")
                    }
                else if (info.kind == "static")
                    this.iconPath = {
                        dark: path.join(...resDirPath, "dark", "library.svg"),
                        light: path.join(...resDirPath, "light", "library.svg")
                    }
                else {
                    // Icon for phony target
                    this.iconPath = {
                        dark: path.join(...resDirPath, "dark", "archive.svg"),
                        light: path.join(...resDirPath, "light", "archive.svg")
                    }
                }
                break;
            case XMakeExplorerItemType.DIRECTORY:
                // this.iconPath = vscode.ThemeIcon.Folder;
                this.resourceUri = vscode.Uri.file(path.join(...info.path));
                break;
            case XMakeExplorerItemType.FILE:
                this.resourceUri = vscode.Uri.file(path.join(...info.path));
                break;
            default:
                break;
        }
    }
}

// Node of an internal representation of the tree view hierarchy
// This can be deeper than the tree that is shown to the user
// This stores all nodes in the most primitive form so that each node 
// corresponds to single entity.
// The main difference between this type and the tree view is that
// empty folders in the tree view are concatenated together to reduce the depth.

class XMakeExplorerHierarchyNode {

    info: XMakeExplorerItemInfo;
    children: XMakeExplorerHierarchyNode[] = new Array();
    expanded: boolean = false;

    constructor(info: XMakeExplorerItemInfo) {
        this.info = info;
    }

    getName(): string {
        switch (this.info.type) {
            case XMakeExplorerItemType.GROUP:
                return this.info.group[this.info.group.length - 1];
            case XMakeExplorerItemType.TARGET:
                return this.info.target;
            case XMakeExplorerItemType.DIRECTORY:
                return this.info.path[this.info.path.length - 1];
            case XMakeExplorerItemType.FILE:
                return this.info.path[this.info.path.length - 1];
            default:
                return "";
        }
    }
}

// Data provider for the tree view

class XMakeExplorerDataProvider implements vscode.TreeDataProvider<XMakeExplorerItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<XMakeExplorerItem | undefined | void> = new vscode.EventEmitter<XMakeExplorerItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<XMakeExplorerItem | undefined | void> = this._onDidChangeTreeData.event;

    // The hierarchy that is shown in the tree view
    // This is populated in the read config function

    private hierarchy: XMakeExplorerHierarchyNode = new XMakeExplorerHierarchyNode({ type: XMakeExplorerItemType.ROOT });

    async refresh(targets: any) {

        const root = new XMakeExplorerHierarchyNode({ type: XMakeExplorerItemType.ROOT });

        // Add the root xmake.lua
        root.children.push(new XMakeExplorerHierarchyNode({ type: XMakeExplorerItemType.FILE, group: [], target: "", path: ["xmake.lua"] }));

        for (let target of targets) {

            let current = root;

            // Create the group hierarchy
            const groups = target.group != "" ? target.group.trim().split("/", 1) : [];
            if (groups.length > 0) {
                const currentGroup: string[] = new Array();
                for (let group of groups) {

                    currentGroup.push(group);

                    // Find or create the group node
                    let groupNode = current.children.find(node => node.info.type == XMakeExplorerItemType.GROUP && node.info.group[node.info.group.length - 1] == group);
                    if (!groupNode) {
                        current.children.push(new XMakeExplorerHierarchyNode({ type: XMakeExplorerItemType.GROUP, group: [...currentGroup] }))
                        groupNode = current.children[current.children.length - 1];
                    }

                    current = groupNode;
                }
            }

            // Add the target

            current.children.push(new XMakeExplorerHierarchyNode({ type: XMakeExplorerItemType.TARGET, group: groups, target: target.name, kind: target.kind }));
            current = current.children[current.children.length - 1];

            const targetNode = current;

            // Add the target script
            const relScriptDir = path.relative(config.workingDirectory, target.scriptdir);
            const targetScript = path.join(relScriptDir, "xmake.lua");
            const scriptPath = this.splitPath(targetScript);
            targetNode.children.push(new XMakeExplorerHierarchyNode({ type: XMakeExplorerItemType.FILE, group: groups, target: target.name, path: scriptPath }));

            // Create folder hierarchy

            for (let file of target.files) {
                const path = this.splitPath(file);
                let subPath: string[] = new Array();

                current = targetNode;

                // Create the sub directory hierarchy
                for (let i = 0; i < path.length - 1; i++) {
                    const subDirName = path[i];
                    subPath.push(subDirName);

                    let subDirNode = current.children.find(node => node.info.type == XMakeExplorerItemType.DIRECTORY && node.info.path[node.info.path.length - 1] == subDirName);
                    if (!subDirNode) {
                        current.children.push(new XMakeExplorerHierarchyNode({ type: XMakeExplorerItemType.DIRECTORY, group: groups, target: target.name, path: [...subPath] }))
                        subDirNode = current.children[current.children.length - 1];
                    }

                    current = subDirNode;
                }

                // Add the file node
                current.children.push(new XMakeExplorerHierarchyNode({ type: XMakeExplorerItemType.FILE, group: groups, target: target.name, path: path }));
                current = current.children[current.children.length - 1];
            }
        }

        // Sort the hierarchy
        this.sortHierarchy(root);

        // Merge expand status
        this.mergeExpandState(this.hierarchy, root);

        // Set the new hierarchy
        this.hierarchy = root;

        // Refresh the tree view
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: XMakeExplorerItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: XMakeExplorerItem): Thenable<XMakeExplorerItem[]> {
        if (element) {
            if (element.info.type === XMakeExplorerItemType.GROUP)
                return Promise.resolve(this.getGroupChildren(element.info.group));
            else if (element.info.type === XMakeExplorerItemType.TARGET)
                return Promise.resolve(this.getTargetChildren(element.info.group, element.info.target));
            else if (element.info.type === XMakeExplorerItemType.DIRECTORY)
                return Promise.resolve(this.getDirectoryChildren(element.info.group, element.info.target, element.info.path));
            else
                return Promise.resolve([]);
        }
        else {
            return Promise.resolve(this.getRootElements());
        }
    }

    itemExpandStateChanged(element: XMakeExplorerItem, expanded: boolean): void {

        if (element.info.type != XMakeExplorerItemType.GROUP && element.info.type != XMakeExplorerItemType.TARGET && element.info.type != XMakeExplorerItemType.DIRECTORY)
            return;

        // Set expanded if the element is a group

        const groups = (() => {
            if (element.info.type === XMakeExplorerItemType.GROUP)
                return element.info.group;
            else if (element.info.type === XMakeExplorerItemType.TARGET)
                return element.info.group;
            else if (element.info.type === XMakeExplorerItemType.DIRECTORY)
                return element.info.group;
            else
                return [];
        })();

        let current = this.hierarchy;
        for (let group of groups) {
            current = current.children.find(item => item.info.type == XMakeExplorerItemType.GROUP && item.getName() == group);
            if (!current)
                break;
        }

        if (element.info.type == XMakeExplorerItemType.GROUP) {

            if (current)
                current.expanded = expanded;
            else
                log.error("Failed to record tree item expand status on group '" + path.join(...groups) + "'");

            return;
        }


        // Set expanded if the element type is target

        const targetName = (() => {
            if (element.info.type == XMakeExplorerItemType.TARGET)
                return (<XMakeExplorerTargetInfo>element.info).target;
            else
                return (<XMakeExplorerDirectoryInfo>element.info).target;
        })();

        current = current.children.find(item => item.info.type == XMakeExplorerItemType.TARGET && item.getName() == targetName);

        if (element.info.type == XMakeExplorerItemType.TARGET) {
            if (current)
                current.expanded = expanded;
            else
                log.error("Failed to record tree item expand status on target '" + targetName + "'");

            return;
        }

        // Set expanded if the element type is a folder

        const dirPath = (<XMakeExplorerDirectoryInfo>element.info).path;
        for (let dir of dirPath) {
            current = current.children.find(item => item.info.type == XMakeExplorerItemType.DIRECTORY && item.getName() == dir);
            if (!current)
                break;
        }

        if (current)
            current.expanded = expanded;
        else
            log.error("Failed to record tree item expand status on directory '" + path.join(...dirPath) + "'");
    }

    private getRootElements() {
        const rootElements: XMakeExplorerItem[] = new Array();

        for (let child of this.hierarchy.children)
            rootElements.push(new XMakeExplorerItem(child.getName(), child.info));

        return rootElements;
    }

    private getGroupChildren(groups: string[]) {
        let current = this.hierarchy;
        for (let group of groups) {
            current = current.children.find(item => item.info.type == XMakeExplorerItemType.GROUP && item.getName() == group);
            if (!current)
                break;
        }

        const groupElements: XMakeExplorerItem[] = new Array();
        if (current) {
            for (let child of current.children)
                groupElements.push(new XMakeExplorerItem(child.getName(), child.info));
        }

        return groupElements;
    }

    private getTargetChildren(groups: string[], targetName: string) {
        let current = this.hierarchy;

        // Traverse groups
        for (let group of groups) {
            current = current.children.find(item => item.info.type == XMakeExplorerItemType.GROUP && item.getName() == group);
            if (!current)
                break;
        }

        // Find the target
        if (current)
            current = current.children.find(item => item.info.type == XMakeExplorerItemType.TARGET && item.getName() == targetName);

        // Create target children
        const targetElements: XMakeExplorerItem[] = new Array();
        if (current) {
            for (let child of current.children) {
                if (child.info.type == XMakeExplorerItemType.DIRECTORY)
                    targetElements.push(this.concatEmptyDirectories(child));
                else
                    targetElements.push(new XMakeExplorerItem(child.getName(), child.info));
            }
        }

        return targetElements;
    }

    private getDirectoryChildren(groups: string[], targetName: string, path: string[]) {
        let current = this.hierarchy;

        // Traverse groups
        for (let group of groups) {
            current = current.children.find(item => item.info.type == XMakeExplorerItemType.GROUP && item.getName() == group);
            if (!current)
                break;
        }

        // Find the target
        if (current)
            current = current.children.find(item => item.info.type == XMakeExplorerItemType.TARGET && item.getName() == targetName);

        // Traverse the directory path
        for (let dir of path) {
            current = current.children.find(item => item.info.type == XMakeExplorerItemType.DIRECTORY && item.getName() == dir);
            if (!current)
                break;
        }

        // Create directory child elements
        const dirElements: XMakeExplorerItem[] = new Array();
        if (current) {
            for (let child of current.children) {
                if (child.info.type == XMakeExplorerItemType.DIRECTORY)
                    dirElements.push(this.concatEmptyDirectories(child));
                else
                    dirElements.push(new XMakeExplorerItem(child.getName(), child.info));
            }
        }

        return dirElements;
    }

    private sortHierarchy(hierarchy: XMakeExplorerHierarchyNode) {
        // Sort immediate children
        hierarchy.children.sort((a, b) => {
            if (a.info.type == b.info.type) {
                if (a.getName() == b.getName())
                    return 0;
                else
                    return a.getName() < b.getName() ? -1 : 1;
            }
            else
                return a.info.type < b.info.type ? -1 : 1;
        });

        // Recursive call to sort grand children
        for (let child of hierarchy.children)
            this.sortHierarchy(child);
    }

    private mergeExpandState(oldHierarchy: XMakeExplorerHierarchyNode, newHierarchy: XMakeExplorerHierarchyNode) {
        for (let oldChild of oldHierarchy.children) {
            const newChild = newHierarchy.children.find(item => item.info.type == oldChild.info.type && item.getName() == oldChild.getName());
            if (newChild) {
                newChild.expanded = oldChild.expanded;
                this.mergeExpandState(oldChild, newChild);
            }
        }
    }

    private splitPath(file_path: string) {
        const parts: string[] = new Array();

        parts.push(path.basename(file_path));

        let dir_path = path.dirname(file_path);
        while (dir_path != ".") {
            const dir = path.basename(dir_path);
            if (dir)
                parts.unshift(dir);
            else
                break;

            dir_path = path.dirname(dir_path);
        }

        return parts;
    }

    private concatEmptyDirectories(dirNode: XMakeExplorerHierarchyNode) {
        const concatPath: string[] = new Array();
        const dirInfo = <XMakeExplorerDirectoryInfo>dirNode.info;
        concatPath.push(dirInfo.path[dirInfo.path.length - 1]);

        let concatChild = dirNode;
        while (concatChild.children.length == 1 && concatChild.children[0].info.type == XMakeExplorerItemType.DIRECTORY) {
            concatChild = concatChild.children[0];
            const collapsedDirInfo = <XMakeExplorerDirectoryInfo>concatChild.info;
            concatPath.push(collapsedDirInfo.path[collapsedDirInfo.path.length - 1]);
        }

        return new XMakeExplorerItem(path.join(...concatPath), concatChild.info);
    }
}

// Data provider for the options panel

class XMakeOptionsProvider implements vscode.WebviewViewProvider {

    private _optionDefinitions?: any; // option definitions read from xmake.lua
    private _optionValues?: any; // option values set by the user
    private _optionsChanged: boolean = false;

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri
    ) { }

    // Overriden from WebviewViewProvider

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken) {

        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this.getHtmlForWebView(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.type) {
                case 'options':
                    {
                        console.log(message.data);
                        this._optionValues = message.data;
                        this._optionsChanged = true;
                        break;
                    }
            }
        });

        if (this._optionDefinitions)
            this._view.webview.postMessage({ type: 'options', data: this._optionDefinitions });
    }

    // Refresh options panel when xmake configuration changes

    public async refresh(optionDefinitions: any) {
        this._optionDefinitions = optionDefinitions;
        this.updateDefaults();
        this.extractOptionValues();

        if (this._view)
            this._view.webview.postMessage({ type: 'options', data: optionDefinitions });

        this._optionsChanged = true;
    }

    // Return the options string suitable for the xmake command

    public getCommandOptions() {
        let cmd = "";
        this._optionValues.forEach(element => {
            cmd += `--${element.name}=${element.value} `;
        });
        return cmd;
    }

    public getOptionsChanged() {
        return this._optionsChanged;
    }

    public setOptionsChanged(changed: boolean) {
        this._optionsChanged = changed;
    }

    // Copy values from optionValues to optionDefinitions so that next refresh is going to show the correct values

    private updateDefaults() {
        if (!this._optionValues)
            return;

        for (let option of this._optionValues) {
            const definition = this._optionDefinitions.find(def => def.name = option.name);
            if (definition)
                definition.default = option.value;
        }
    }

    // Extract option values from option definitions. This is done when new option definitions are received so add/remove options from option values.

    private extractOptionValues() {
        // clear current option values
        if (this._optionValues)
            this._optionValues.splice(0, this._optionValues.length);
        else
            this._optionValues = new Array();

        // re-populate option values
        for (let option of this._optionDefinitions) {
            this._optionValues.push({ name: option.name, value: option.default });
        }
    }

    // Helper function to construct the web view content

    private getHtmlForWebView(webview: vscode.Webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'explorer', 'options.js'));

        // Do the same for the stylesheet.
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'explorer', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'explorer', 'vscode.css'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'assets', 'explorer', 'main.css'));

        // Use a nonce to only allow a specific script to be run.
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				
				<title>Options</title>
			</head>
			<body>
				<form id="options">
				</form>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }

    private getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}

// XMakeExplorer contains the targets view and options view
// Define all the commands

export class XMakeExplorer implements vscode.Disposable {

    private _xmakeExplorerDataProvider: XMakeExplorerDataProvider;
    private _treeView: vscode.TreeView<XMakeExplorerItem>;
    private _xmakeOptionsProvider: XMakeOptionsProvider;

    async init(context: vscode.ExtensionContext) {

        const info = await this.readInfo();

        // Tree view

        this._xmakeExplorerDataProvider = new XMakeExplorerDataProvider();
        if (info)
            await this._xmakeExplorerDataProvider.refresh(info.targets);

        this._treeView = vscode.window.createTreeView('xmakeExplorer', {
            treeDataProvider: this._xmakeExplorerDataProvider
        });

        // Track expand and collapse in tree view

        this._treeView.onDidCollapseElement(evt => {
            this._xmakeExplorerDataProvider.itemExpandStateChanged(evt.element, false);
        });

        this._treeView.onDidExpandElement(evt => {
            this._xmakeExplorerDataProvider.itemExpandStateChanged(evt.element, true);
        });

        // Open file command for files in the tree view

        vscode.commands.registerCommand('xmakeExplorer.openFile', (file_path: string) => {
            const uri = vscode.Uri.file(file_path);
            vscode.workspace.openTextDocument(uri).then(doc => vscode.window.showTextDocument(uri));
        }
        );

        // Options panel

        this._xmakeOptionsProvider = new XMakeOptionsProvider(context.extensionUri);
        if (info)
            this._xmakeOptionsProvider.refresh(info.options);

        vscode.window.registerWebviewViewProvider("xmakeOptions", this._xmakeOptionsProvider);

        // Build commands

        vscode.commands.registerCommand('xmakeExplorer.buildAll', () => {
            vscode.commands.executeCommand("xmake.onBuild");
        });

        vscode.commands.registerCommand('xmakeExplorer.rebuildAll', (item: XMakeExplorerItem) => {
            vscode.commands.executeCommand("xmake.onRebuild");
        });

        vscode.commands.registerCommand('xmakeExplorer.cleanAll', (item: XMakeExplorerItem) => {
            vscode.commands.executeCommand("xmake.onCleanAll");
        });

        vscode.commands.registerCommand('xmakeExplorer.build', (item: XMakeExplorerItem) => {
            if (item.info.type == XMakeExplorerItemType.TARGET)
                vscode.commands.executeCommand("xmake.onBuild", item.info.target);
        });

        vscode.commands.registerCommand('xmakeExplorer.rebuild', (item: XMakeExplorerItem) => {
            if (item.info.type == XMakeExplorerItemType.TARGET)
                vscode.commands.executeCommand("xmake.onRebuild", item.info.target);
        });

        vscode.commands.registerCommand('xmakeExplorer.clean', (item: XMakeExplorerItem) => {
            if (item.info.type == XMakeExplorerItemType.TARGET)
                vscode.commands.executeCommand("xmake.onClean", item.info.target);
        });
    }

    dispose() {
        this._treeView.dispose();
        this._xmakeExplorerDataProvider = undefined;
    }

    // Refresh is called whenever the configuration is changed

    async refresh() {
        const info = await this.readInfo();
        if (info) {
            await this._xmakeExplorerDataProvider.refresh(info.targets);
            await this._xmakeOptionsProvider.refresh(info.options);
        }
    }

    // Option accessors

    public getCommandOptions() {
        return this._xmakeOptionsProvider.getCommandOptions();
    }

    public getOptionsChanged() {
        return this._xmakeOptionsProvider.getOptionsChanged();
    }

    public setOptionsChanged(changed: boolean) {
        return this._xmakeOptionsProvider.setOptionsChanged(changed);
    }

    // Helper function to read all the information used by the explorer from xmake.lua

    private async readInfo() {
        const getExplorerTargetsScript = path.join(__dirname, `../../assets/explorer.lua`);
        if (fs.existsSync(getExplorerTargetsScript)) {
            const infoJson = (await process.iorunv("xmake", ["l", getExplorerTargetsScript], { "COLORTERM": "nocolor" }, config.workingDirectory)).stdout.trim();
            const info = JSON.parse(infoJson);
            return info;
        }
        else
            return null;
    }
}