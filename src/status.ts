'use strict';

// imports
import * as vscode from 'vscode';
import {log} from './log';
import {config} from './config';

interface Hideable {
    show(): void;
    hide(): void;
  }
  
  function setVisible<T extends Hideable>(i: T, v: boolean) {
    if (v) {
      i.show();
    } else {
      i.hide();
    }
  }

// the status class
export class Status implements vscode.Disposable {

    // the build button
    private readonly _buildButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 3.4);

    // is visible?
    private _visible: boolean = true;

    // the constructor
    constructor() {

        // init build button
        this._buildButton.command = 'xmake.onBuild';
        this._buildButton.text = `$(gear) Build`;

        // update visibility
        this.updateVisibility();
    }

    // dispose all objects
    public dispose() {

        for (const item of [this._buildButton]) {
            item.dispose();
        }
    }

    // update visibility
    private updateVisibility() {
        for (const item of [this._buildButton]) {
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
}
