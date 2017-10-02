'use strict';

// imports
import * as vscode from 'vscode';
import * as proc from 'child_process';
import * as fs from 'fs';

// the iorunv result interface
export interface IResultIORunv {
    retval: Number;
    stdout: string;
    stderr: string;
}

// run shell program with arguments and return output content
export function iorunv(program: string, args: string[], options?: proc.SpawnOptions): Promise<IResultIORunv> {
    return new Promise<IResultIORunv>((resolve, reject) => {
        const child = proc.spawn(program, args, options);
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
/*
// execute shell program with arguments and echo output
export function execv(program: string, args: string[], env: {[key: string]: string} = {},
    workingDirectory?: string,
    outputChannel: vscode.OutputChannel|null = null): ExecutionInformation {

  const acc = {stdout: '', stderr: ''};
  if (outputChannel) {
    outputChannel.appendLine(
        '[vscode] Executing command: '
        // We do simple quoting of arguments with spaces.
        // This is only shown to the user,
        // and doesn't have to be 100% correct.
        +
        [program]
            .concat(args)
            .map(a => a.replace('"', '\"'))
            .map(a => /[ \n\r\f;\t]/.test(a) ? `"${a}"` : a)
            .join(' '));
  }

  const final_env = mergeEnvironment(process.env, env);
  const pipe = proc.spawn(program, args, {
    env: final_env,
    cwd: workingDirectory,
  });
  for (const [acckey, stream] of [
           ['stdout', pipe.stdout],
           ['stderr', pipe.stderr]] as [string, NodeJS.ReadableStream][]) {
    let backlog = '';
    stream.on('data', (data: Uint8Array) => {
      backlog += data.toString();
      acc[acckey] += data.toString();
      let n = backlog.indexOf('\n');
      // got a \n? emit one or more 'line' events
      while (n >= 0) {
        stream.emit('line', backlog.substring(0, n).replace(/\r+$/, ''));
        backlog = backlog.substring(n + 1);
        n = backlog.indexOf('\n');
      }
    });
    stream.on('end', () => {
      if (backlog) {
        stream.emit('line', backlog.replace(/\r+$/, ''));
        if (outputChannel) {
          outputChannel.appendLine(backlog.replace(/\r+$/, ''));
        }
      }
    });
    stream.on('line', (line: string) => {
      log.verbose(`[${program} output]: ${line}`);
      if (outputChannel) {
        outputChannel.appendLine(line);
      }
    });
  }
  const pr = new Promise<api.ExecutionResult>((resolve, reject) => {
    pipe.on('error', reject);
    pipe.on('close', (retc: number) => {
      const msg = `${program} exited with return code ${retc}`;
      if (outputChannel) {
        outputChannel.appendLine(`[vscode] ${msg}`)
      }
      else {
        log.verbose(msg);
      }
      resolve({retc, stdout: acc.stdout, stderr: acc.stderr});
    })
  });

  return {
    process: pipe,
    onComplete: pr,
  };
}
*/