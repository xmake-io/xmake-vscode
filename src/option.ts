'use strict';

// imports
import * as vscode from 'vscode';

// the option class
export class Option implements vscode.Disposable {

    // the entries
    private _entries: Map<string, any>;

    // the constructor
    constructor() {
        this._entries = new Map();
    }

    // dispose
    public dispose() {
        this._entries.clear();
    }

    // get value from the given key
    public get<T>(key: string): T|null {
        return this._entries.get(key) as T;
    }
    
    // get value from the given key
    public set(key: string, value: any) {
        this._entries.set(key, value);
    }
}