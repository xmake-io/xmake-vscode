'use strict';

// imports
import * as vscode from 'vscode';

const MAX_CHARACTER_NUM = 255;

// handle line break within single quote
const lineBreakRegex = /(\r\n)(?=([^'\\]*(\\.|'([^'\\]*\\.)*[^'\\]*'))*[^']*$)/;

// e.g. error: .\\include\\xmake.lua:26: global 'add_cflags' is not callable (a nil value)
const luaOutputRegex = /^([^:]+):\s([^:]+):(\d+):\s(.+)$/;

// e.g. .\\include\\xmake.lua:24: warning: cl: unknown c compiler flag '-ox'
const xmakeOutputRegex = /^([^:]+):(\d+):\s([^:]+):\s(.+)$/;

export function isEligible(filePath: string | undefined): boolean {
    return filePath && filePath.includes("xmake.lua") && !filePath.includes(".xmake");
}

export function parse(output: string): vscode.Diagnostic[] {
    const collection: vscode.Diagnostic[] = [];
    output.split(lineBreakRegex).forEach(outputLine => {
        if (outputLine) {
            let level = "";
            let file = "";
            let line = 0;
            let message = "";
            let matches = luaOutputRegex.exec(outputLine);
            if (matches) {
                level = matches[1].trim();
                file = matches[2].trim();
                line = parseInt(matches[3].trim());
                message = matches[4].trim();
            } else {
                matches = xmakeOutputRegex.exec(outputLine);
                if (matches) {
                    file = matches[1].trim();
                    line = parseInt(matches[2].trim());
                    level = matches[3].trim();
                    message = matches[4].trim();
                }
            }

            let severity = vscode.DiagnosticSeverity.Hint;
            if (level == "error") {
                severity = vscode.DiagnosticSeverity.Error;
            } else if (level == "warning") {
                severity = vscode.DiagnosticSeverity.Warning;
            }

            if (severity == vscode.DiagnosticSeverity.Error ||
                severity == vscode.DiagnosticSeverity.Warning) {
                let diag = new vscode.Diagnostic(
                    new vscode.Range(
                        new vscode.Position(line - 1, 0), new vscode.Position(line - 1, MAX_CHARACTER_NUM),
                    ),
                    message,
                    severity
                );
                diag.source = 'xmake';
                collection.push(diag);
            }
        }
    });

    return collection;
}