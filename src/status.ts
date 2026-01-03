'use strict';

// imports
import * as vscode from 'vscode';
import {log} from './log';
import {config} from './config';

// the status class
export class Status implements vscode.Disposable {

    // the xmake button
    private readonly _xmakeButton = vscode.window.createStatusBarItem(
        "Xmake", vscode.StatusBarAlignment.Right, 3100);

    // the project button
    private readonly _projectButton = vscode.window.createStatusBarItem(
        "Xmake Project", vscode.StatusBarAlignment.Right, 3000);

    // the platform button
    private readonly _platButton = vscode.window.createStatusBarItem(
        "Xmake Config: Platform", vscode.StatusBarAlignment.Right, 2900);

    // the architecture button
    private readonly _archButton = vscode.window.createStatusBarItem(
        "Xmake Config: Arch", vscode.StatusBarAlignment.Right, 2800);

    // the mode button
    private readonly _modeButton = vscode.window.createStatusBarItem(
        "Xmake Config: Mode", vscode.StatusBarAlignment.Right, 2700);

    // the build button
    private readonly _buildButton = vscode.window.createStatusBarItem(
        "Xmake Build", vscode.StatusBarAlignment.Right, 2500);

    // the target button
    private readonly _targetButton = vscode.window.createStatusBarItem(
        "Xmake Config: Target", vscode.StatusBarAlignment.Right, 2400);

    // the run button
    private readonly _runButton = vscode.window.createStatusBarItem(
        "Xmake Run", vscode.StatusBarAlignment.Right, 2300);

    // the debug button
    private readonly _debugButton = vscode.window.createStatusBarItem(
        "Xmake Debug", vscode.StatusBarAlignment.Right, 2200);

    // is visible?
    private _visible: boolean = true;

    // the toolchain
    private readonly _toolChainButton = vscode.window.createStatusBarItem(
        "Xmake Config: Toolchain", vscode.StatusBarAlignment.Right, 2600);

    // the disposables
    private _disposables: vscode.Disposable[] = [];

    // the constructor
    constructor() {

        // init xmake button
        this._xmakeButton.command = 'xmake.onShowExplorer';
        this._xmakeButton.text = `$(xmake-logo) Xmake`;
        this._xmakeButton.tooltip = "Show Xmake Explorer";

        // init project button
        this._projectButton.command = 'xmake.setProjectRoot';
        this._projectButton.text = `Xmake:`;
        this._projectButton.tooltip = "Set the project root directory";

        // init platform button
        this._platButton.command = 'xmake.setTargetPlat';
        this._platButton.text = `macosx`;
        this._platButton.tooltip = "Set the target platform";

        // init architecture button
        this._archButton.command = 'xmake.setTargetArch';
        this._archButton.text = `x86_64`;
        this._archButton.tooltip = "Set the target architecture";

        // init mode button
        this._modeButton.command = 'xmake.setBuildMode';
        this._modeButton.text = `debug`;
        this._modeButton.tooltip = "Set build mode";

        // init build button, icons: https://octicons.github.com/
        this._buildButton.command = 'xmake.onBuild';
        this._buildButton.text = `$(xmake-build)`;
        this._buildButton.tooltip = "Build the given target";

        // init target button
        this._targetButton.command = 'xmake.setDefaultTarget';
        this._targetButton.text = `default`;
        this._targetButton.tooltip = "Set the default target";

        // init run button
        this._runButton.command = 'xmake.onRun';
        this._runButton.text = `$(play)`;
        this._runButton.tooltip = "Run the given target";

        // init debug button
        this._debugButton.command = 'xmake.onDebug';
        this._debugButton.text = `$(bug)`;
        this._debugButton.tooltip = "Debug the given target";

        // init toolchain button
        this._toolChainButton.command = 'xmake.setTargetToolchain';
        this._toolChainButton.text = `toolchain`;
        this._toolChainButton.tooltip = "change the toolchain";

        for (let item of [
            this._xmakeButton,
            this._projectButton,
            this._platButton,
            this._archButton,
            this._modeButton,
            this._buildButton,
            this._targetButton,
            this._runButton,
            this._debugButton,
            this._toolChainButton
        ]) {
            item.name = item.id;
        }

        // update visibility on config change
        this._disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('xmake.status')) {
                this.updateVisibility();
            }
        }));

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
            this._targetButton,
            this._runButton,
            this._debugButton,
            this._toolChainButton
        ]) {
            item.dispose();
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
            { item: this._targetButton, show: config.statusShowTarget },
            { item: this._runButton, show: config.statusShowRun },
            { item: this._debugButton, show: config.statusShowDebug },
            { item: this._toolChainButton, show: config.statusShowToolchain },
        ];

        for (const { item, show } of buttons) {
            if (this.visible && !!item.text && show) {
                item.show();
            } else {
                item.hide();
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
        this._projectButton.text = `Xmake: ${value}`;
    }

    // get the project root
    public get project(): string {
        return this._projectButton.text.replace('Xmake: ', '');
    }

    // set the target platform
    public set plat(value: string) {
        this._platButton.text = value;
    }

    // get the target platform
    public get plat(): string {
        return this._platButton.text;
    }

    // set the toolchain
    public set toolchain(value: string) {
        this._toolChainButton.text = value;
    }

    // get the toolchain
    public get toolchain(): string {
        return this._toolChainButton.text;
    }

    // set the target architecture
    public set arch(value: string) {
        this._archButton.text = value;
    }

    // get the target architecture
    public get arch(): string {
        return this._archButton.text;
    }

    // set the build mode
    public set mode(value: string) {
        this._modeButton.text = value;
    }

    // get the build mode
    public get mode(): string {
        return this._modeButton.text;
    }

    // set the default target
    public set target(value: string) {
        this._targetButton.text = value;
    }

    // get the default target
    public get target(): string {
        return this._targetButton.text;
    }

    // start to record
    public startRecord() {
    }

    // stop to record
    public stopRecord() {
    }
}
