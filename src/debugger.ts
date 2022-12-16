'use strict';

// imports
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as encoding from 'encoding';
import * as process from './process';
import { log } from './log';
import { config } from './config';

// the debugger class

async function findGdbPath(): Promise<string> {
    let gdbPath = null;
    let findGdbScript = path.join(__dirname, `../../assets/find_gdb.lua`);
    if (fs.existsSync(findGdbScript)) {
        gdbPath = (await process.iorunv(config.executable, ["l", findGdbScript], {"COLORTERM": "nocolor"}, config.workingDirectory)).stdout.trim();
        if (gdbPath) {
            gdbPath = gdbPath.split('\n')[0].trim();
        }
    }
    return gdbPath? gdbPath : "";
}