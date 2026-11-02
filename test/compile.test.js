const fs = require('fs');
const path = require('path');

const PREFIX = '[compile]';

function log(msg) {
    console.log(`${PREFIX} ${msg}`);
}

function logErr(msg) {
    console.error(`${PREFIX} ${msg}`);
}

function runTests() {
    log('Running compilation tests...');

    const outDir = path.join(__dirname, '../out');

    const mainFiles = [
        'extension.js',
        'xmake.js',
        'terminal.js',
        'process.js'
    ];

    let allPassed = true;

    mainFiles.forEach(file => {
        const filePath = path.join(outDir, file);
        if (!fs.existsSync(filePath)) {
            logErr(`  ❌ Missing file: ${file}`);
            allPassed = false;
            return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        if (content.length === 0) {
            logErr(`  ❌ Empty file: ${file}`);
            allPassed = false;
            return;
        }

        log(`  ✅ ${file} - OK`);
    });

    try {
        const extensionPath = path.join(outDir, 'extension.js');
        const extensionContent = fs.readFileSync(extensionPath, 'utf8');

        if (extensionContent.includes('activate') && extensionContent.includes('deactivate')) {
            log('  ✅ extension.js exports - OK');
        } else {
            logErr('  ❌ extension.js missing required exports');
            allPassed = false;
        }
    } catch (e) {
        logErr(`  ❌ Error reading extension.js: ${e.message}`);
        allPassed = false;
    }

    try {
        const xmakePath = path.join(outDir, 'xmake.js');
        const xmakeContent = fs.readFileSync(xmakePath, 'utf8');

        if (xmakeContent.includes('execCommandsSequentially') && xmakeContent.includes('getConfigureArgs')) {
            log('  ✅ xmake.js new methods - OK');
        } else {
            logErr('  ❌ xmake.js missing new methods');
            allPassed = false;
        }
    } catch (e) {
        logErr(`  ❌ Error reading xmake.js: ${e.message}`);
        allPassed = false;
    }

    try {
        const terminalPath = path.join(outDir, 'terminal.js');
        const terminalContent = fs.readFileSync(terminalPath, 'utf8');

        const hasPromise = terminalContent.includes('return new Promise((resolve) =>');
        const hasEvent = terminalContent.includes('onDidEndTaskProcess');
        const hasExitCode = terminalContent.includes('e.exitCode') && terminalContent.includes('resolve');

        if (hasPromise && hasEvent && hasExitCode) {
            log('  ✅ terminal.js updated methods - OK');
        } else {
            logErr('  ❌ terminal.js missing updated methods');
            allPassed = false;
        }
    } catch (e) {
        logErr(`  ❌ Error reading terminal.js: ${e.message}`);
        allPassed = false;
    }

    if (allPassed) {
        log('✅ All compilation tests passed!\n');
        return true;
    } else {
        logErr('❌ Some compilation tests failed!\n');
        return false;
    }
}

if (require.main === module) {
    const passed = runTests();
    process.exit(passed ? 0 : 1);
}

module.exports = runTests;
