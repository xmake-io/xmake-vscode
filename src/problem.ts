'use strict';

// imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as encoding from 'encoding';
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
                    
                    // init regex of msvc output
                    const rOutputMsvc: RegExp = new RegExp("(.*?)\\(([0-9]*)\\): (.*?) .*?: (.*)");                    
                    // init diagnostics map
                    let diagnosticsMap: Map<string, vscode.Diagnostic[]> = new Map();
    
                    // parse errors and warnings
                    content.split("\n").forEach(textLine => {
                        if (textLine) {

                            // parse warning and error from the given text line
                            let matches: RegExpExecArray = os.platform() == "win32"? rOutputMsvc.exec(textLine) : rOutputGcc.exec(textLine);
                            if (matches) { 

                                // get warning and error info
                                let file = "";
                                let line = "0";
                                let column = "0";
                                let kind = "error";
                                let message = "";
                                if (os.platform() == "win32") {

                                    file = matches[1].trim();
                                    line = matches[2].trim();
                                    kind = matches[3].toLocaleLowerCase().trim();
                                    message = matches[4].trim();

                                } else {

                                    file = matches[2].trim();
                                    line = matches[3].trim();
                                    column = matches[4].trim();
                                    kind = matches[5].toLocaleLowerCase().trim();
                                    message = matches[6].trim();
                                }

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