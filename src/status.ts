'use strict';

// imports
import * as vscode from 'vscode';
import {log} from './log';
import {config} from './config';

// the status class
export class Status implements vscode.Disposable {

    // the project button
    private readonly _projectButton = vscode.window.createStatusBarItem(
        "Xmake Project", vscode.StatusBarAlignment.Left, 4.6);

    // the platform button
    private readonly _platButton = vscode.window.createStatusBarItem(
        "XMake Config: Platform", vscode.StatusBarAlignment.Left, 4.5);

    // the architecture button
    private readonly _archButton = vscode.window.createStatusBarItem(
        "Xmake Config: Arch", vscode.StatusBarAlignment.Left, 4.4);

    // the mode button
    private readonly _modeButton = vscode.window.createStatusBarItem(
        "XMake Config: Mode", vscode.StatusBarAlignment.Left, 4.3);

    // the build button
    private readonly _buildButton = vscode.window.createStatusBarItem(
        "Xmake Build", vscode.StatusBarAlignment.Left, 4.2);

    // the target button
    private readonly _targetButton = vscode.window.createStatusBarItem(
        "XMake Config: Target", vscode.StatusBarAlignment.Left, 4.1);

    // the run button
    private readonly _runButton = vscode.window.createStatusBarItem(
        "XMake Run", vscode.StatusBarAlignment.Left, 4.0);

    // the debug button
    private readonly _debugButton = vscode.window.createStatusBarItem(
        "XMake Debug", vscode.StatusBarAlignment.Left, 3.9);

    // the macro record button
    private readonly _macroRecordButton = vscode.window.createStatusBarItem(
        "XMake Macro: Record", vscode.StatusBarAlignment.Left, 3.8);

    // the macro playback button
    private readonly _macroPlaybackButton = vscode.window.createStatusBarItem(
        "XMake Macro: Play", vscode.StatusBarAlignment.Left, 3.7);

    // is visible?
    private _visible: boolean = true;

    // the toolchain
    private readonly _toolChainButton = vscode.window.createStatusBarItem(
        "XMake Config: Toolchain", vscode.StatusBarAlignment.Left, 4.3);

    // the constructor
    constructor() {

        // init project button
        this._projectButton.command = 'xmake.setProjectRoot';
        this._projectButton.text = `XMake:`;
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
        this._buildButton.text = `$(gear) Build`;
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

        // init macro record button
        this._macroRecordButton.command = 'xmake.onMacroBegin';
        this._macroRecordButton.text = `$(primitive-square)`;
        this._macroRecordButton.tooltip = "Record a anonymous macro";

        // init macro playback button
        this._macroPlaybackButton.command = 'xmake.onMacroRun';
        this._macroPlaybackButton.text = `$(history)`;
        this._macroPlaybackButton.tooltip = "Playback the last anonymous macro";

        // init toolchain button
        this._toolChainButton.command = 'xmake.setTargetToolchain';
        this._toolChainButton.text = `toolchain`;
        this._toolChainButton.tooltip = "change the toolchain";

        for (let item of [
            this._projectButton,
            this._platButton,
            this._archButton,
            this._modeButton,
            this._buildButton,
            this._targetButton,
            this._runButton,
            this._debugButton,
            this._macroRecordButton,
            this._macroPlaybackButton,
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
            this._projectButton,
            this._platButton,
            this._archButton,
            this._modeButton,
            this._buildButton,
            this._targetButton,
            this._runButton,
            this._debugButton,
            this._macroRecordButton,
            this._macroPlaybackButton,
            this._toolChainButton
        ]) {
            item.dispose();
        }
    }

    // update visibility
    private updateVisibility() {
        for (const item of [
            this._projectButton,
            this._platButton,
            this._archButton,
            this._modeButton,
            this._buildButton,
            this._targetButton,
            this._runButton,
            this._debugButton,
            this._macroRecordButton,
            this._macroPlaybackButton,
            this._toolChainButton
        ]) {
            if (this.visible && !!item.text) {
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
        this._projectButton.text = `XMake: ${value}`;
    }

    // get the project root
    public get project(): string {
        return this._projectButton.text.replace('XMake: ', '');
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
        this._macroRecordButton.command = 'xmake.onMacroEnd';
        this._macroRecordButton.text = `$(primitive-dot)`;
    }

    // stop to record
    public stopRecord() {
        this._macroRecordButton.command = 'xmake.onMacroBegin';
        this._macroRecordButton.text = `$(primitive-square)`;
    }
}
