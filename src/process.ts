'use strict';

// imports
import * as vscode from 'vscode';
import * as proc from 'child_process';
import * as fs from 'fs';
import {log} from './log';

// the execution result interface
export interface IExecutionResult {
    retval: Number;
    stdout: string;
    stderr: string;
}

// the execution handle interface
export interface IExecutionHandle {
    onComplete: Promise<IExecutionResult>;
    process: proc.ChildProcess;
}

// add environment variables
export function addenv(...env: {[key: string]: string}[]) {
    return env.reduce((acc, vars) => {
        if (process.platform === 'win32') {
            const norm_vars = Object.getOwnPropertyNames(vars).reduce<Object>(
                (acc2, key: string) => {
                    acc2[key.toUpperCase()] = vars[key];
                    return acc2;
                }, {});
            return Object.assign({}, acc, norm_vars);
        } else {
            return Object.assign({}, acc, vars);
        }
    }, {})
}

// run shell program with arguments and return output content
export function iorunv(program: string, args: string[], env: {[key: string]: string} = {}, workingDirectory?: string): Promise<IExecutionResult> {

    // trace
    log.verbose('os.execv: ' + [program].concat(args).map(a => a.replace('"', '\"')).map(a => /[ \n\r\f;\t]/.test(a) ? `"${a}"` : a).join(' '));
    
    // return exenution result promise
    return new Promise<IExecutionResult>((resolve, reject) => {
        const child = proc.spawn(program, args, {env: addenv(process.env, env), cwd: workingDirectory});
        child.on('error', (err) => {
            reject(err);
        });
        let stdout_acc = '';
        let stderr_acc = '';
        child.stdout.on('data', (data: Uint8Array) => {
            stdout_acc += data.toString();
        });
        child.stderr.on('data', (data: Uint8Array) => {
            stderr_acc += data.toString();
        });
        child.on('exit', (retval) => {
            resolve({retval: retval, stdout: stdout_acc, stderr: stderr_acc});
        });
    });
}

// execute shell program with arguments and without output
export function runv(program: string, args: string[], env: {[key: string]: string} = {}, workingDirectory?: string): Promise<IExecutionResult> {
    return execv(program, args, env, workingDirectory, null);
}

// execute shell program with arguments and echo output
export function execv(program: string, args: string[], env: {[key: string]: string} = {}, workingDirectory?: string, outputChannel: vscode.OutputChannel|null = null): Promise<IExecutionResult> {

    // trace
    log.verbose('os.execv: ' + [program].concat(args).map(a => a.replace('"', '\"')).map(a => /[ \n\r\f;\t]/.test(a) ? `"${a}"` : a).join(' '));

    // execute process
    const pipe = proc.spawn(program, args, {env: addenv(process.env, env), cwd: workingDirectory});

    // handle stdout and stderr stream 
    const acc = {stdout: '', stderr: ''};
    for (const [acckey, stream] of [['stdout', pipe.stdout], ['stderr', pipe.stderr]] as [string,  NodeJS.ReadableStream][]) {

        let backlog = '';
        stream.on('data', (data: Uint8Array) => {

            // save data to acc
            acc[acckey] += data.toString();
            
            // append data ot backlog
            backlog += data.toString();

            // got a \n? emit one or more 'line' events 
            let n = backlog.indexOf('\n');
            while (n >= 0) {
                stream.emit('line', backlog.substring(0, n).replace(/\r+$/, ''));
                backlog = backlog.substring(n + 1);
                n = backlog.indexOf('\n');
            }
        });

        // stream end?
        stream.on('end', () => {
            if (backlog) {
                stream.emit('line', backlog.replace(/\r+$/, ''));
                if (outputChannel) {
                    outputChannel.appendLine(backlog.replace(/\r+$/, ''));
                 }
            }
        });

        // show line data
        stream.on('line', (line: string) => {
            log.verbose(line);
            if (outputChannel) {
                outputChannel.appendLine(line);
            }
        });
    }

    // return exenution result promise
    return new Promise<IExecutionResult>((resolve, reject) => {
        pipe.on('error', reject);
        pipe.on('close', (retval: number) => {
            log.verbose(`${program} exited with return code ${retval}`);
            resolve({retval, stdout: acc.stdout, stderr: acc.stderr});
        })
    });
}
