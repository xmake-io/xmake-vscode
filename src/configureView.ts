
'use strict';

// This file implements the TreeView for XMake configuration in VS Code.
// It defines the data structure, item types, and data provider for the configuration view.

import * as vscode from 'vscode';
import { Status } from './status';


// Enum for item types in the configuration view: folder or entry
enum XMakeConfigureViewItemType {
    FOLDER,
    ENTRY
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
    info: XMakeConfigureViewFolderInfo | XMakeConfigureViewEntryInfo;

    /**
     * Construct a TreeItem for either a folder or an entry.
     * @param info Folder or entry info
     */
    constructor(info: XMakeConfigureViewFolderInfo | XMakeConfigureViewEntryInfo) {
        let label: string;
        let collapsibleState: vscode.TreeItemCollapsibleState;
        let description: string | undefined = undefined;

        if (info.type === XMakeConfigureViewItemType.FOLDER) {
            label = info.name;
            collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        } else {
            label = info.name;
            description = info.value;
            collapsibleState = vscode.TreeItemCollapsibleState.None;
        }
        super(label, collapsibleState);
        this.info = info;
        // Assign command for entry items so they are clickable
        if (info.type === XMakeConfigureViewItemType.ENTRY) {
            this.command = {
                command: `xmake.${XMakeCommandMap[info.name].command}`,
                title: XMakeCommandMap[info.name].title,
            }
            // For debug: log command registration
            console.log(`Command registered: ${this.command.command} with title: ${this.command.title}`);
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
    { type: XMakeConfigureViewItemType.FOLDER, name: "Build", children: ["Target"] }
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


// Data provider for the XMake configuration TreeView
class XMakeConfigureViewDataProvider implements vscode.TreeDataProvider<XMakeConfigureViewItem> {
    private status: Status;
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

    /**
     * @param status The Status instance for current configuration
     */
    constructor(status?: Status) {
        this.status = status;
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
            // Return root folders
            return ROOT_STRUCTURE.map(folder =>
                new XMakeConfigureViewItem({
                    type: XMakeConfigureViewItemType.FOLDER,
                    name: folder.name
                })
            );
        }
        if (element.info.type === XMakeConfigureViewItemType.FOLDER) {
            // Return entries under the folder
            const folder = ROOT_STRUCTURE.find(f => f.name === element.info.name);
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
                    value: value
                });
            });
        }
        return [];
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
        this._dataProvider = new XMakeConfigureViewDataProvider(status);
        this._treeView = vscode.window.createTreeView(
            "xmakeConfigureView",
            { treeDataProvider: this._dataProvider }
        )
    }

    /**
     * Refresh the configuration view.
     */
    refresh(): void {
        this._dataProvider.refresh();
    }

    /**
     * Dispose the tree view and its resources.
     */
    dispose() {
        this._treeView.dispose();
    }
}