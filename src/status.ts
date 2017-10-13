'use strict';

// imports
import * as vscode from 'vscode';
import {log} from './log';
import {config} from './config';

// the status class
export class Status implements vscode.Disposable {

    // the platform button
    private readonly _platButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 4.5);

    // the architecture button
    private readonly _archButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 4.4);
    
    // the mode button
    private readonly _modeButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 4.3);
    
    // the build button
    private readonly _buildButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 4.2);
    
    // the target button
    private readonly _targetButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 4.1);

    // the run button
    private readonly _runButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 4.0);
    
    // the debug button
    private readonly _debugButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.9);
    
    // the macro record button
    private readonly _macroRecordButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.8);

    // the macro playback button
    private readonly _macroPlaybackButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.7);
    
    // is visible?
    private _visible: boolean = true;

    // the constructor
    constructor() {

        // init platform button
        this._platButton.command = 'xmake.setTargetPlat';
        this._platButton.text = `XMake: macosx`;
        this._platButton.tooltip = "Set the target platform";

        // init architecture button
        this._archButton.command = 'xmake.setTargetArch';
        this._archButton.text = `x86_64`;
        this._archButton.tooltip = "Set the target architecture";

        // init mode button
        this._modeButton.command = 'xmake.setBuildMode';
        this._modeButton.text = `release`;
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
        this._runButton.text = `$(triangle-right)`;
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

        // update visibility
        this.updateVisibility();
    }

    // dispose all objects
    public dispose() {

        for (const item of [this._platButton, 
                            this._archButton,
                            this._modeButton,
                            this._buildButton, 
                            this._targetButton,
                            this._runButton,
                            this._debugButton,
                            this._macroRecordButton,
                            this._macroPlaybackButton]) {
            item.dispose();
        }
    }

    // update visibility
    private updateVisibility() {
        for (const item of [this._platButton, 
                            this._archButton,
                            this._modeButton,
                            this._buildButton, 
                            this._targetButton,
                            this._runButton,
                            this._debugButton,
                            this._macroRecordButton,
                            this._macroPlaybackButton]) {
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
    
    // set the target platform  
    public set plat(value: string) {
        this._platButton.text = `XMake: ${value}`;
    }

    // set the target architecture  
    public set arch(value: string) {
        this._archButton.text = value;
    }

    // set the build mode  
    public set mode(value: string) {
        this._modeButton.text = value;
    }

    // set the default target   
    public set target(value: string) {
        this._targetButton.text = value;
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
