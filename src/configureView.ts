
'use strict';

// This file implements the TreeView for XMake configuration in VS Code.
// It defines the data structure, item types, and data provider for the configuration view.

import * as vscode from 'vscode';
import * as path from 'path';
import { Status } from './status';
import { config } from './config';
import * as utils from './utils';
import { XMakeProjectOptionInfo, XMakeProjectOptionValue } from './projectInfo';

// Enum for item types in the configuration view: folder or entry
enum XMakeConfigureViewItemType {
    FOLDER,
    ENTRY,
    CATEGORY,
    OPTION,
    OPTION_DETAIL
}


// Folder item info type
type XMakeConfigureViewFolderInfo = {
    type: XMakeConfigureViewItemType.FOLDER;
    name: string;
}


// Entry item info type (leaf node)
type XMakeConfigureViewEntryInfo = {
    type: XMakeConfigureViewItemType.ENTRY;
    name: string;
    value: string;
    command: string;
    title: string;
}


// Option item info type (dynamic leaf node)
type XMakeConfigureViewOptionInfo = {
    type: XMakeConfigureViewItemType.OPTION;
    option: XMakeProjectOptionInfo;
}


// Category item info type (dynamic folder node)
type XMakeConfigureViewCategoryInfo = {
    type: XMakeConfigureViewItemType.CATEGORY;
    name: string;
    path: string[];
}


// Option detail item info type (dynamic child node)
type XMakeConfigureViewOptionDetailInfo = {
    type: XMakeConfigureViewItemType.OPTION_DETAIL;
    option: XMakeProjectOptionInfo;
    label: string;
    value?: string;
    file?: string;
    command?: string;
    title?: string;
    args?: any[];
}


// Map entry names to their corresponding command and title
const XMakeCommandMap: Record<string, { command: string, title: string }> = {
    "Name": { command: "setProjectRoot", title: "Change Project Name" },
    "Platform": { command: "setTargetPlat", title: "Change Platform" },
    "Architecture": { command: "setTargetArch", title: "Change Architecture" },
    "Toolchain": { command: "setTargetToolchain", title: "Change Toolchain" },
    "Mode": { command: "setBuildMode", title: "Change Mode" },
    "Target": { command: "setDefaultTarget", title: "Change Target" }
};


// TreeItem for the XMake configuration view
class XMakeConfigureViewItem extends vscode.TreeItem {
    info: XMakeConfigureViewFolderInfo | XMakeConfigureViewEntryInfo | XMakeConfigureViewCategoryInfo | XMakeConfigureViewOptionInfo | XMakeConfigureViewOptionDetailInfo;

    /**
     * Construct a TreeItem for either a folder or an entry.
     * @param info Folder or entry info
     */
    constructor(info: XMakeConfigureViewFolderInfo | XMakeConfigureViewEntryInfo | XMakeConfigureViewCategoryInfo | XMakeConfigureViewOptionInfo | XMakeConfigureViewOptionDetailInfo, editableOptions = false, expandableOptions = false) {
        let label: string;
        let collapsibleState: vscode.TreeItemCollapsibleState;
        let description: string | undefined = undefined;

        if (info.type === XMakeConfigureViewItemType.FOLDER) {
            label = info.name;
            collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        } else if (info.type === XMakeConfigureViewItemType.CATEGORY) {
            label = info.name;
            collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        } else if (info.type === XMakeConfigureViewItemType.ENTRY) {
            label = info.name;
            description = info.value;
            collapsibleState = vscode.TreeItemCollapsibleState.None;
        } else if (info.type === XMakeConfigureViewItemType.OPTION_DETAIL) {
            label = info.label;
            description = info.value;
            collapsibleState = vscode.TreeItemCollapsibleState.None;
        } else {
            label = info.option.name;
            description = buildOptionDescription(info.option, expandableOptions);
            collapsibleState = expandableOptions ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
        }
        super(label, collapsibleState);
        this.info = info;
        // Assign command for entry items so they are clickable
        if (info.type === XMakeConfigureViewItemType.ENTRY) {
            this.command = {
                command: `xmake.${info.command}`,
                title: info.title,
            }
        }
        if (info.type === XMakeConfigureViewItemType.CATEGORY && expandableOptions) {
            this.iconPath = {
                dark: utils.getResourcePath("dark/window.svg"),
                light: utils.getResourcePath("light/window.svg")
            }
        }
        if (info.type === XMakeConfigureViewItemType.OPTION && editableOptions) {
            this.command = {
                command: 'xmake.setProjectOption',
                title: 'Change Project Option',
                arguments: [info.option.name]
            }
        }
        if (info.type === XMakeConfigureViewItemType.OPTION) {
            this.tooltip = buildOptionTooltip(info.option);
        }
        if (info.type === XMakeConfigureViewItemType.OPTION && expandableOptions) {
            this.iconPath = {
                dark: utils.getResourcePath("dark/gear.svg"),
                light: utils.getResourcePath("light/gear.svg")
            }
        }
        if (info.type === XMakeConfigureViewItemType.OPTION_DETAIL && info.command) {
            this.command = {
                command: info.command,
                title: info.title,
                arguments: info.args
            }
        }
        if (info.type === XMakeConfigureViewItemType.OPTION_DETAIL && info.file) {
            this.resourceUri = vscode.Uri.file(info.file);
        }
        if (description) {
            this.description = description;
        }
    }
}


// The root structure of the configuration view: folders and their children
const ROOT_STRUCTURE = [
    { type: XMakeConfigureViewItemType.FOLDER, name: "Project", children: ["Name"] },
    { type: XMakeConfigureViewItemType.FOLDER, name: "Configure", children: ["Platform", "Architecture", "Toolchain", "Mode"] },
    { type: XMakeConfigureViewItemType.FOLDER, name: "Build", children: ["Target"] },
    { type: XMakeConfigureViewItemType.FOLDER, name: "Options", children: [] }
];


// Map entry names to Status property keys
const XMakeStatusMap: Record<string, string> = {
    "Name": "project",
    "Platform": "plat",
    "Architecture": "arch",
    "Toolchain": "toolchain",
    "Mode": "mode",
    "Target": "target"
};


function optionValueToString(value: XMakeProjectOptionValue): string {
    if (value === undefined || value === null) {
        return "";
    }
    return String(value);
}


function buildOptionTooltip(option: XMakeProjectOptionInfo): vscode.MarkdownString | undefined {
    const tooltip = new vscode.MarkdownString(`\`xmake f --${option.name}=<value>\``);
    tooltip.isTrusted = false;
    return tooltip;
}


function buildOptionDescription(option: XMakeProjectOptionInfo, descriptionOnly = false): string {
    const value = optionValueToString(option.value);
    const description = option.description ? option.description.replace(/\s+/g, ' ').trim() : "";
    if (descriptionOnly) {
        return description;
    }
    if (value && description) {
        return `${value} - ${description}`;
    }
    return value || description;
}


function getOptionCategoryParts(option: XMakeProjectOptionInfo): string[] {
    if (!option.category) {
        return [];
    }
    const parts = option.category.split('/').map(part => part.trim()).filter(part => part.length > 0);
    if (parts.length > 0 && parts[parts.length - 1] === option.name) {
        parts.pop();
    }
    return parts;
}


function isPrefix(prefix: string[], parts: string[]): boolean {
    return prefix.every((part, index) => parts[index] === part);
}


// Data provider for the XMake configuration TreeView
type XMakeConfigureViewOptions = {
    editableOptions?: boolean;
    showRootFolders?: boolean;
    expandableOptions?: boolean;
}


class XMakeConfigureViewDataProvider implements vscode.TreeDataProvider<XMakeConfigureViewItem> {
    private status: Status;
    private projectOptions: XMakeProjectOptionInfo[] = [];
    private editableOptions: boolean;
    private expandableOptions: boolean;
    private showRootFolders: boolean;
    private _onDidChangeTreeData:
        vscode.EventEmitter<XMakeConfigureViewItem | undefined | void> =
        new vscode.EventEmitter();
    readonly onDidChangeTreeData:
        vscode.Event<XMakeConfigureViewItem | undefined | void> =
        this._onDidChangeTreeData.event;

    /**
     * Refresh the tree view by firing the change event.
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setProjectOptions(projectOptions?: XMakeProjectOptionInfo[]): void {
        this.projectOptions = projectOptions ? [...projectOptions] : [];
        this.projectOptions.sort((left, right) => left.name.localeCompare(right.name));
        this.refresh();
    }

    /**
     * @param status The Status instance for current configuration
     */
    constructor(status?: Status, options: XMakeConfigureViewOptions = {}) {
        this.status = status;
        this.editableOptions = options.editableOptions ?? false;
        this.expandableOptions = options.expandableOptions ?? false;
        this.showRootFolders = options.showRootFolders ?? true;
    }

    /**
     * Get the TreeItem for a given element.
     */
    getTreeItem(element: XMakeConfigureViewItem): XMakeConfigureViewItem {
        return element;
    }

    /**
     * Get the children for a given element (or root folders if no element).
     */
    getChildren(element?: XMakeConfigureViewItem): vscode.ProviderResult<XMakeConfigureViewItem[]> {
        if (!element) {
            if (!this.showRootFolders) {
                return this.getProjectOptionChildren([]);
            }
            // Return root folders
            return ROOT_STRUCTURE.map(folder =>
                new XMakeConfigureViewItem({
                    type: XMakeConfigureViewItemType.FOLDER,
                    name: folder.name
                })
            );
        }
        if (element.info.type === XMakeConfigureViewItemType.FOLDER) {
            const folderName = element.info.name;
            if (folderName === "Options") {
                return this.getProjectOptionChildren([]);
            }

            // Return entries under the folder
            const folder = ROOT_STRUCTURE.find(f => f.name === folderName);
            if (!folder) return [];
            return folder.children.map(childName => {
                let value = "unknown";
                if (this.status && typeof this.status === 'object') {
                    const key = XMakeStatusMap[childName];
                    value = this.status[key] ?? "unknown";
                }
                return new XMakeConfigureViewItem({
                    type: XMakeConfigureViewItemType.ENTRY,
                    name: childName,
                    value: value,
                    command: XMakeCommandMap[childName].command,
                    title: XMakeCommandMap[childName].title
                });
            });
        }
        if (element.info.type === XMakeConfigureViewItemType.CATEGORY) {
            return this.getProjectOptionChildren(element.info.path);
        }
        if (element.info.type === XMakeConfigureViewItemType.OPTION && this.expandableOptions) {
            return this.getOptionDetails(element.info.option);
        }
        return [];
    }

    private getOptionDetails(option: XMakeProjectOptionInfo): XMakeConfigureViewItem[] {
        const details: XMakeConfigureViewItem[] = [];
        if (option.file) {
            const label = path.relative(config.workingDirectory, option.file) || path.basename(option.file);
            details.push(new XMakeConfigureViewItem({
                type: XMakeConfigureViewItemType.OPTION_DETAIL,
                option: option,
                label: label,
                value: option.line ? `line ${option.line}` : undefined,
                file: option.file,
                command: "xmake.openProjectOptionDefinition",
                title: "Open Option Definition",
                args: [option.name]
            }));
        }
        return details;
    }

    private getProjectOptionChildren(categoryPath: string[]): XMakeConfigureViewItem[] {
        const categories = new Map<string, string[]>();
        const options: XMakeProjectOptionInfo[] = [];

        for (const option of this.projectOptions) {
            const parts = getOptionCategoryParts(option);
            if (!isPrefix(categoryPath, parts)) {
                continue;
            }
            if (parts.length === categoryPath.length) {
                options.push(option);
                continue;
            }
            const categoryName = parts[categoryPath.length];
            categories.set(categoryName, parts.slice(0, categoryPath.length + 1));
        }

        const categoryItems = Array.from(categories.entries())
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([name, path]) => new XMakeConfigureViewItem({
                type: XMakeConfigureViewItemType.CATEGORY,
                name: name,
                path: path
            }, this.editableOptions, this.expandableOptions));
        const optionItems = options
            .sort((left, right) => left.name.localeCompare(right.name))
            .map(option => new XMakeConfigureViewItem({
                type: XMakeConfigureViewItemType.OPTION,
                option: option
            }, this.editableOptions, this.expandableOptions));
        return categoryItems.concat(optionItems);
    }
}


/**
 * Controller class for the XMake configuration TreeView.
 * Handles data provider, refresh, and disposal.
 */
export class XMakeConfigureView implements vscode.Disposable {
    private _dataProvider: XMakeConfigureViewDataProvider;
    private _treeView: vscode.TreeView<vscode.TreeItem>;

    /**
     * @param status The Status instance for current configuration
     */
    constructor(status: Status) {
        this._dataProvider = new XMakeConfigureViewDataProvider(status, {
            editableOptions: true,
            showRootFolders: true,
            expandableOptions: false
        });
        this._treeView = vscode.window.createTreeView(
            "xmakeConfigureView",
            { treeDataProvider: this._dataProvider }
        )
    }

    /**
     * Refresh the configuration view.
     */
    refresh(projectOptions?: XMakeProjectOptionInfo[]): void {
        if (projectOptions) {
            this._dataProvider.setProjectOptions(projectOptions);
        } else {
            this._dataProvider.refresh();
        }
    }

    /**
     * Dispose the tree view and its resources.
     */
    dispose() {
        this._treeView.dispose();
    }
}


/**
 * Controller class for the read-only XMake project options TreeView.
 */
export class XMakeOptionsView implements vscode.Disposable {
    private _dataProvider: XMakeConfigureViewDataProvider;
    private _treeView: vscode.TreeView<vscode.TreeItem>;

    constructor() {
        this._dataProvider = new XMakeConfigureViewDataProvider(undefined, {
            editableOptions: false,
            showRootFolders: false,
            expandableOptions: true
        });
        this._treeView = vscode.window.createTreeView(
            "xmakeOptionsView",
            { treeDataProvider: this._dataProvider }
        )
    }

    refresh(projectOptions?: XMakeProjectOptionInfo[]): void {
        if (projectOptions) {
            this._dataProvider.setProjectOptions(projectOptions);
        } else {
            this._dataProvider.refresh();
        }
    }

    dispose() {
        this._treeView.dispose();
    }
}
