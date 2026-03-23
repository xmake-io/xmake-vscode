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

            // Judge the encoding method
            const iconv = require("iconv-lite");

            const isUtf8Bom = (buffer: Buffer) => buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
            const isUtf16LeBom = (buffer: Buffer) => buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE;
            const isUtf16BeBom = (buffer: Buffer) => buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF;

            const decodeWithConfidence = (buffer: Buffer): { encoding: string, text: string } => {
                if (isUtf8Bom(buffer)) {
                    return { encoding: "utf8-bom", text: buffer.slice(3).toString("utf8") };
                }
                if (isUtf16LeBom(buffer)) {
                    return { encoding: "utf16le-bom", text: iconv.decode(buffer.slice(2), "utf16le") };
                }
                if (isUtf16BeBom(buffer)) {
                    return { encoding: "utf16be-bom", text: iconv.decode(buffer.slice(2), "utf16be") };
                }

                const utf8Text = buffer.toString("utf8");
                if (Buffer.from(utf8Text, "utf8").equals(buffer)) {
                    return { encoding: "utf8", text: utf8Text };
                }

                const gbkText = iconv.decode(buffer, "gbk");
                if (iconv.encode(gbkText, "gbk").equals(buffer)) {
                    return { encoding: "gbk", text: gbkText };
                }

                const utf8ReplacementCount = (utf8Text.match(/\uFFFD/g) || []).length;
                const gbkReplacementCount = (gbkText.match(/\uFFFD/g) || []).length;
                if (gbkReplacementCount < utf8ReplacementCount) {
                    return { encoding: "gbk-fallback", text: gbkText };
                }

                return { encoding: "utf8-fallback", text: utf8Text };
            };

            // on windows?
            const isWin = os.platform() == "win32";

            // read the log file
            fs.readFile(logfile, null, (err, content) => {

                if (!err && content) {
                    const decoded = decodeWithConfidence(content);
                    const text = decoded.text;
                    // log.verbose(`diagnose logfile encoding: ${decoded.encoding}`);

                    // init regex of gcc/clang output
                    const rOutputGcc: RegExp = new RegExp("^(error: )?(.*?):([0-9]*):([0-9]*): (.*?): (.*)$");

                    // init regex of msvc output
                    const rOutputMsvc: RegExp = new RegExp("(.*?)\\(([0-9]*)\\): (.*?) .*?: (.*)");
                    // init diagnostics map
                    let diagnosticsMap: Map<string, vscode.Diagnostic[]> = new Map();

                    // parse errors and warnings
                    text.split("\n").forEach(textLine => {
                        if (textLine) {

                            // parse warning and error from the given text line
                            let matches: RegExpExecArray = isWin? rOutputMsvc.exec(textLine) : rOutputGcc.exec(textLine);
                            if (matches) {

                                // get warning and error info
                                let file = "";
                                let line = "0";
                                let column = "0";
                                let kind = "error";
                                let message = "";
                                if (isWin) {

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
