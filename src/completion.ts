'use strict';

// imports
import * as vscode from 'vscode';
import {log} from './log';

// get lua keyword list
function getLuaKeywordList(): Promise<string> {
    return new Promise(function (resolve, reject) {
        resolve(["if", "function", "for", "local", "else", "elseif", "then", "end", "nil", "true", "false", "do", "while"].join('\n'));
    });
}

// get xmake command list
function getXMakeCommandList(): Promise<string> {
    return new Promise(function (resolve, reject) {

        // the default xmake command list
        const defaultCmds = "add_arflags|add_asflags|add_cflags|add_cfunc|add_cfuncs|add_cincludes|add_csnippet|add_ctypes|add_cxflags|add_cxxflags|add_cxxfunc|add_cxxfuncs|add_cxxincludes|add_cxxsnippet|add_cxxtypes|add_dcflags|add_cuflags|add_culdflags|add_gcflags|add_defines|add_deps|add_files|add_frameworkdirs|add_frameworks|add_gcflags|add_headers|add_includedirs|add_languages|add_ldflags|add_linkdirs|add_links|add_mflags|add_moduledirs|add_mxflags|add_mxxflags|add_options|add_packagedirs|add_packages|add_plugindirs|add_rcflags|add_rpathdirs|add_scflags|add_shflags|add_undefines|add_vectorexts|after_load|after_build|after_check|after_clean|after_install|after_package|after_run|after_uninstall|after_link|before_load|before_build|before_check|before_clean|before_install|before_package|before_run|before_uninstall|before_link|catch|cprint|cprintf|finally|format|ifelse|import|includes|inherit|ipairs|is_arch|is_host|is_kind|is_mode|is_os|is_plat|on_load|on_build|on_check|on_clean|on_install|on_load|on_package|on_run|on_uninstall|on_link|option|option_end|pairs|print|printf|raise|set_basename|set_category|set_default|set_description|add_headerfiles|add_installfiles|set_installdir|add_configfiles|set_kind|set_languages|set_menu|set_objectdir|set_optimize|set_options|set_pcheader|set_pcxxheader|set_project|set_showmenu|set_strip|set_symbols|set_targetdir|set_version|set_warnings|set_xmakever|target|target_end|task|task_end|rule|rule_end|add_values|set_values|add_rules|set_tools|add_tools|on_build_file|on_build_files|after_build_file|after_build_files|before_build_file|before_build_files|add_requires|try|val|vformat|has_config|is_config|add_cucodegens|set_rundir|add_runenvs|package|on_test|set_urls|add_urls|add_versions".split('|').join('\n');

        // TODO: get commands from `xmake man --commands-list`
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