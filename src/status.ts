'use strict';

// imports
import * as vscode from 'vscode';
import {log} from './log';
import {config} from './config';

// the status class
export class Status implements vscode.Disposable {

    // the xmake button
    private _xmakeButton: vscode.StatusBarItem;

    // the project button
    private _projectButton: vscode.StatusBarItem;

    // the platform button
    private _platButton: vscode.StatusBarItem;

    // the architecture button
    private _archButton: vscode.StatusBarItem;

    // the mode button
    private _modeButton: vscode.StatusBarItem;

    // the toolchain
    private _toolChainButton: vscode.StatusBarItem;

    // the build button
    private _buildButton: vscode.StatusBarItem;

    // the rebuild button
    private _rebuildButton: vscode.StatusBarItem;

    // the target button
    private _targetButton: vscode.StatusBarItem;

    // the run button
    private _runButton: vscode.StatusBarItem;

    // the debug button
    private _debugButton: vscode.StatusBarItem;

    // is visible?
    private _visible: boolean = true;

    // the disposables
    private _disposables: vscode.Disposable[] = [];

    // the constructor
    constructor() {

        // create buttons
        this.createButtons();

        // update visibility on config change
        this._disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('xmake.status')) {
                if (e.affectsConfiguration('xmake.status.alignment')) {
                    this.createButtons(true);
                } else {
                    this.updateVisibility();
                }
            }
        }));

        // update visibility
        this.updateVisibility();
    }

    // create buttons
    private createButtons(restore: boolean = false) {

        // save texts
        let xmakeButtonText = this._xmakeButton ? this._xmakeButton.text : null;
        let projectButtonText = this._projectButton ? this._projectButton.text : null;
        let platButtonText = this._platButton ? this._platButton.text : null;
        let archButtonText = this._archButton ? this._archButton.text : null;
        let modeButtonText = this._modeButton ? this._modeButton.text : null;
        let toolChainButtonText = this._toolChainButton ? this._toolChainButton.text : null;
        let buildButtonText = this._buildButton ? this._buildButton.text : null;
        let rebuildButtonText = this._rebuildButton ? this._rebuildButton.text : null;
        let targetButtonText = this._targetButton ? this._targetButton.text : null;
        let runButtonText = this._runButton ? this._runButton.text : null;
        let debugButtonText = this._debugButton ? this._debugButton.text : null;

        // dispose old buttons
        if (this._xmakeButton) { this._xmakeButton.hide(); this._xmakeButton.dispose(); }
        if (this._projectButton) { this._projectButton.hide(); this._projectButton.dispose(); }
        if (this._platButton) { this._platButton.hide(); this._platButton.dispose(); }
        if (this._archButton) { this._archButton.hide(); this._archButton.dispose(); }
        if (this._modeButton) { this._modeButton.hide(); this._modeButton.dispose(); }
        if (this._toolChainButton) { this._toolChainButton.hide(); this._toolChainButton.dispose(); }
        if (this._buildButton) { this._buildButton.hide(); this._buildButton.dispose(); }
        if (this._rebuildButton) { this._rebuildButton.hide(); this._rebuildButton.dispose(); }
        if (this._targetButton) { this._targetButton.hide(); this._targetButton.dispose(); }
        if (this._runButton) { this._runButton.hide(); this._runButton.dispose(); }
        if (this._debugButton) { this._debugButton.hide(); this._debugButton.dispose(); }

        // get alignment
        let alignment = vscode.StatusBarAlignment.Right;
        let idSuffix = "";
        if (config.statusAlignment === 'left') {
            alignment = vscode.StatusBarAlignment.Left;
            idSuffix = " (Left)";
        }

        // init xmake button
        this._xmakeButton = vscode.window.createStatusBarItem(
            "Xmake" + idSuffix, alignment, 3100);
        this._xmakeButton.command = 'xmake.onShowExplorer';
        this._xmakeButton.text = restore && xmakeButtonText ? xmakeButtonText : `$(xmake-logo) Xmake`;
        this._xmakeButton.tooltip = "Show Xmake Explorer";

        // init project button
        this._projectButton = vscode.window.createStatusBarItem(
            "Xmake Project" + idSuffix, alignment, 3000);
        this._projectButton.command = 'xmake.setProjectRoot';
        this._projectButton.text = restore && projectButtonText ? projectButtonText : `Xmake:`;
        this._projectButton.tooltip = "Set the project root directory";

        // init platform button
        this._platButton = vscode.window.createStatusBarItem(
            "Xmake Config: Platform" + idSuffix, alignment, 2900);
        this._platButton.command = 'xmake.setTargetPlat';
        this._platButton.text = restore && platButtonText ? platButtonText : `macosx`;
        this._platButton.tooltip = "Set the target platform";

        // init architecture button
        this._archButton = vscode.window.createStatusBarItem(
            "Xmake Config: Arch" + idSuffix, alignment, 2800);
        this._archButton.command = 'xmake.setTargetArch';
        this._archButton.text = restore && archButtonText ? archButtonText : `x86_64`;
        this._archButton.tooltip = "Set the target architecture";

        // init mode button
        this._modeButton = vscode.window.createStatusBarItem(
            "Xmake Config: Mode" + idSuffix, alignment, 2700);
        this._modeButton.command = 'xmake.setBuildMode';
        this._modeButton.text = restore && modeButtonText ? modeButtonText : `debug`;
        this._modeButton.tooltip = "Set build mode";

        // init toolchain button
        this._toolChainButton = vscode.window.createStatusBarItem(
            "Xmake Config: Toolchain" + idSuffix, alignment, 2600);
        this._toolChainButton.command = 'xmake.setTargetToolchain';
        this._toolChainButton.text = restore && toolChainButtonText ? toolChainButtonText : `toolchain`;
        this._toolChainButton.tooltip = "change the toolchain";

        // init build button, icons: https://octicons.github.com/
        this._buildButton = vscode.window.createStatusBarItem(
            "Xmake Build" + idSuffix, alignment, 2500);
        this._buildButton.command = 'xmake.onBuild';
        this._buildButton.text = restore && buildButtonText ? buildButtonText : `$(xmake-build)`;
        this._buildButton.tooltip = "Build the given target";

        // init rebuild button
        this._rebuildButton = vscode.window.createStatusBarItem(
            "Xmake Rebuild" + idSuffix, alignment, 2450);
        this._rebuildButton.command = 'xmake.onRebuild';
        this._rebuildButton.text = restore && rebuildButtonText ? rebuildButtonText : `$(refresh)`;
        this._rebuildButton.tooltip = "Rebuild the given target";

        // init target button
        this._targetButton = vscode.window.createStatusBarItem(
            "Xmake Config: Target" + idSuffix, alignment, 2400);
        this._targetButton.command = 'xmake.setDefaultTarget';
        this._targetButton.text = restore && targetButtonText ? targetButtonText : `default`;
        this._targetButton.tooltip = "Set the default target";

        // init run button
        this._runButton = vscode.window.createStatusBarItem(
            "Xmake Run" + idSuffix, alignment, 2300);
        this._runButton.command = 'xmake.onRun';
        this._runButton.text = restore && runButtonText ? runButtonText : `$(play)`;
        this._runButton.tooltip = "Run the given target";

        // init debug button
        this._debugButton = vscode.window.createStatusBarItem(
            "Xmake Debug" + idSuffix, alignment, 2200);
        this._debugButton.command = 'xmake.onDebug';
        this._debugButton.text = restore && debugButtonText ? debugButtonText : `$(bug)`;
        this._debugButton.tooltip = "Debug the given target";

        for (let item of [
            this._xmakeButton,
            this._projectButton,
            this._platButton,
            this._archButton,
            this._modeButton,
            this._buildButton,
            this._rebuildButton,
            this._targetButton,
            this._runButton,
            this._debugButton,
            this._toolChainButton
        ]) {
            item.name = item.id;
        }

        // update visibility
        this.updateVisibility();
    }

    // dispose all objects
    public dispose() {

        for (const item of [
            this._xmakeButton,
            this._projectButton,
            this._platButton,
            this._archButton,
            this._modeButton,
            this._buildButton,
            this._rebuildButton,
            this._targetButton,
            this._runButton,
            this._debugButton,
            this._toolChainButton
        ]) {
            if (item) item.dispose();
        }

        for (const disposable of this._disposables) {
            disposable.dispose();
        }
    }

    // update visibility
    private updateVisibility() {
        const buttons = [
            { item: this._xmakeButton, show: config.statusShowXMake },
            { item: this._projectButton, show: config.statusShowProject },
            { item: this._platButton, show: config.statusShowPlatform },
            { item: this._archButton, show: config.statusShowArch },
            { item: this._modeButton, show: config.statusShowMode },
            { item: this._buildButton, show: config.statusShowBuild },
            { item: this._rebuildButton, show: config.statusShowRebuild },
            { item: this._targetButton, show: config.statusShowTarget },
            { item: this._runButton, show: config.statusShowRun },
            { item: this._debugButton, show: config.statusShowDebug },
            { item: this._toolChainButton, show: config.statusShowToolchain },
        ];

        for (const { item, show } of buttons) {
            if (item) {
                if (this.visible && !!item.text && show) {
                    item.show();
                } else {
                    item.hide();
                }
            }
        }
    }

    // get visible
    public get visible(): boolean {
        return this._visible;
    }

    // set visible
    public set visible(v: boolean) {
        this._visible = v;
        this.updateVisibility();
    }

    // set the project root
    public set project(value: string) {
        if (this._projectButton) {
            this._projectButton.text = `Xmake: ${value}`;
        }
    }

    // get the project root
    public get project(): string {
        return this._projectButton ? this._projectButton.text.replace('Xmake: ', '') : "";
    }

    // set the target platform
    public set plat(value: string) {
        if (this._platButton) {
            this._platButton.text = value;
        }
    }

    // get the target platform
    public get plat(): string {
        return this._platButton ? this._platButton.text : "";
    }

    // set the toolchain
    public set toolchain(value: string) {
        if (this._toolChainButton) {
            this._toolChainButton.text = value;
        }
    }

    // get the toolchain
    public get toolchain(): string {
        return this._toolChainButton ? this._toolChainButton.text : "";
    }

    // set the target architecture
    public set arch(value: string) {
        if (this._archButton) {
            this._archButton.text = value;
        }
    }

    // get the target architecture
    public get arch(): string {
        return this._archButton ? this._archButton.text : "";
    }

    // set the build mode
    public set mode(value: string) {
        if (this._modeButton) {
            this._modeButton.text = value;
        }
    }

    // get the build mode
    public get mode(): string {
        return this._modeButton ? this._modeButton.text : "";
    }

    // set the default target
    public set target(value: string) {
        if (this._targetButton) {
            this._targetButton.text = value;
        }
    }

    // get the default target
    public get target(): string {
        return this._targetButton ? this._targetButton.text : "";
    }

    // start to record
    public startRecord() {
    }

    // stop to record
    public stopRecord() {
    }
}
