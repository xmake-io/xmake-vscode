'use strict';

// imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import {xmakeCommands} from './commands';
import {log} from './log';
import * as path from 'path';
import { config } from './config';
import * as process from './process';

// get lua keyword list
function getLuaKeywordList(): Promise<string> {
    return new Promise(function (resolve, reject) {
        resolve(["if", "function", "for", "local", "else", "elseif", "then", "end", "nil", "true", "false", "do", "while"].join('\n'));
    });
}

// get xmake command list
function getXMakeCommandList(): Promise<string> {
    return new Promise(async function (resolve, reject) {
        /* wait for xmake 2.9.3
        let getApisScript = path.join(__dirname, `../../assets/apis.lua`);
        if (fs.existsSync(getApisScript)) {
            let result = (await process.iorunv(config.executable, ["l", getApisScript], { "COLORTERM": "nocolor" },
                config.workingDirectory)).stdout.trim();
            if (result) {
                result = result.split('__end__')[0].trim();
                let resultJson = JSON.parse(result);
                if (resultJson && resultJson.length > 0) {
                    resolve(resultJson.join('\n'));
                    return;
                }
            }
        }*/
        const defaultCmds = xmakeCommands.join('\n');
        resolve(defaultCmds);
    });
}

// word.contains(pattern)?
function wordContains(word, pattern) {
    return word.indexOf(pattern) > -1;
}

// insert lua keyword text
function insertLuaKeywordText(word: string) {
    const snippets = {  if: word + ' ${1} then\n\t\nend',
                        for: word + ' ${1} in ${2} do\n\t\nend',
                        while: word + ' ${1} do\n\t\nend',
                        function: word + ' ${1}(${2}) \n\t\nend'};
    return snippets[word]? snippets[word] : word + ' ${1}';
}

// insert xmake command text
function insertXMakeCommandText(func: string) {
    return func + '(${1})'
}

// get suggestions
function getSuggestions(cmdlist, currentWord: string, kind: vscode.CompletionItemKind, insertText, matchPredicate): Thenable<vscode.CompletionItem[]> {

    return new Promise(function (resolve, reject) {
        cmdlist.then(function (stdout: string) {

            // match suitable commands 
            let commands = stdout.split('\n').filter(function (cmd) { return matchPredicate(cmd, currentWord) });
            if (commands.length > 0) {

                // make suggestions from commands
                let suggestions = commands.map(function (command_name) {

                    // make completion item
                    var item = new vscode.CompletionItem(command_name);
                    item.kind = kind;
                    if (insertText == null || insertText == '') {
                        item.insertText = command_name;
                    } else {
                        let snippet = new vscode.SnippetString(insertText(command_name));
                        item.insertText = snippet;
                    }
                    return item;
                });
                resolve(suggestions);
            } else {
                resolve([]);
            }

        }).catch(function (err) {
            reject(err);
        });
    });
}

// get lua keywords suggestions from the given word
function getLuaKeywordsSuggestions(word: string): Thenable<vscode.CompletionItem[]> {
    let cmd = getLuaKeywordList();
    return getSuggestions(cmd, word, vscode.CompletionItemKind.Function, insertLuaKeywordText, wordContains);
}

// get xmake commands suggestions from the given word
function getXMakeCommandsSuggestions(word: string): Thenable<vscode.CompletionItem[]> {
    let cmd = getXMakeCommandList();
    return getSuggestions(cmd, word, vscode.CompletionItemKind.Function, insertXMakeCommandText, wordContains);
}

// the option class
export class Completion implements vscode.CompletionItemProvider {

    // provide completion items
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {

        // get the current word
        let wordAtPosition = document.getWordRangeAtPosition(position);
        var currentWord = '';
        if (wordAtPosition && wordAtPosition.start.character < position.character) {
            var word = document.getText(wordAtPosition);
            currentWord = word.substr(0, position.character - wordAtPosition.start.character);
        }

        // get suggestion results
        return new Promise(function (resolve, reject) {
            Promise.all([
                getLuaKeywordsSuggestions(currentWord),
                getXMakeCommandsSuggestions(currentWord)
            ]).then(function (results) {
                var suggestions = Array.prototype.concat.apply([], results);
                resolve(suggestions);
            }).catch(err => { reject(err); });
        });
    }

    /*
    // resolve completion item
    public resolveCompletionItem(item: vscode.CompletionItem, token: vscode.CancellationToken): Thenable<vscode.CompletionItem> {
        
        // TODO: add documentation for this completion item
        return new Promise(function (resolve, reject) { 
            item.documentation = "xxxxxxxxxxx";
            resolve(item);
         });
    }*/
}
