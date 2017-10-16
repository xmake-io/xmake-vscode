'use strict';

// imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {log} from './log';
import {config} from './config';

// the problem list class
export class ProblemList implements vscode.Disposable {

    // the diagnostic collection
    private _diagnosticCollection: vscode.DiagnosticCollection;

    // the constructor
    constructor() {

        // init diagnostic collection
        this._diagnosticCollection = vscode.languages.createDiagnosticCollection("build");
    }

    // dispose
    public dispose() {
        this._diagnosticCollection.dispose();
    }

    // clear problems 
    public clear() {
        
        // clear the previous problems first
        this._diagnosticCollection.clear();
    }

    // diagnose problems from the current logfile
    public diagnose(logfile: string) {
        
        // clear the previous problems first
        this._diagnosticCollection.clear();

        // exists logfile?
        if (logfile) {

            // read the log file
            fs.readFile(logfile, "utf8", (err, content) => {

                if (!err && content) {
                    
                    // init regex of gcc/clang output
                    const rOutputGcc: RegExp = new RegExp("^(error: )?(.*?):([0-9]*):([0-9]*): (.*?): (.*)$");
                    
                    // init diagnostics map
                    let diagnosticsMap: Map<string, vscode.Diagnostic[]> = new Map();
    
                    // parse errors and warnings
                    content.split("\n").forEach(textLine => {
                        if (textLine) {

                            // parse warning and error from the given text line
                            let matches: RegExpExecArray = rOutputGcc.exec(textLine);
                            if (matches) { 

                                // get warning and error info
                                let file = matches[2].trim();
                                let line = matches[3].trim();
                                let column = matches[4].trim();
                                let kind = matches[5].toLocaleLowerCase().trim();
                                let message = matches[6].trim();

                                // get uri of file
                                let uri: vscode.Uri = vscode.Uri.file(path.isAbsolute(file)? file : path.join(config.workingDirectory, file));

                                // get diagnostics of this file
                                let diagnostics: vscode.Diagnostic[] = diagnosticsMap.get(uri.fsPath);                      
                                // init severity 
                                let severity: vscode.DiagnosticSeverity = {error: vscode.DiagnosticSeverity.Error, warning: vscode.DiagnosticSeverity.Warning}[kind];
                                if (severity != vscode.DiagnosticSeverity.Error && severity != vscode.DiagnosticSeverity.Warning) {
                                    severity = vscode.DiagnosticSeverity.Error;
                                }

                                // get start line and column
                                let startLine = Number(line);
                                let startColumn = Number(column);
                                if (startLine > 0) startLine -= 1;
                                if (startColumn > 0) startColumn -= 1;

                                // get end line and column
                                let endLine = startLine;
                                let endColumn = startColumn;

                                // init range
                                let range = new vscode.Range(startLine, startColumn, endLine, endColumn);
                                
                                // save diagnostic
                                let diagnostic = new vscode.Diagnostic(range, message, severity);
                                if (!diagnostics) {
                                    diagnostics = [];
                                    diagnosticsMap.set(uri.fsPath, diagnostics);
                                }
                                diagnostics.push(diagnostic);                         
                            }
                        }
                    });

                    // update to the problem list
                    diagnosticsMap.forEach((diagnostics: vscode.Diagnostic[], fsPath:string) => {
                        this._diagnosticCollection.set(vscode.Uri.file(fsPath), diagnostics);
                    });
                }
                else if (err) {
                    log.error(err.message);
                } 
            });
        }
    }
}