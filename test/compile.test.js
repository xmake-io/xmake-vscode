const fs = require('fs');
const path = require('path');

// Simple test to verify TypeScript compilation
function runTests() {
    console.log('Running compilation tests...');
    
    const outDir = path.join(__dirname, '../out');
    
    // Check if main output files exist
    const mainFiles = [
        'extension.js',
        'xmake.js',
        'terminal.js',
        'process.js'
    ];
    
    let allTestsPassed = true;
    
    mainFiles.forEach(file => {
        const filePath = path.join(outDir, file);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Missing file: ${file}`);
            allTestsPassed = false;
            return;
        }
        
        // Check file is not empty
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.length === 0) {
            console.error(`❌ Empty file: ${file}`);
            allTestsPassed = false;
            return;
        }
        
        console.log(`✅ ${file} - OK`);
    });
    
    // Test specific content
    try {
        const extensionPath = path.join(outDir, 'extension.js');
        const extensionContent = fs.readFileSync(extensionPath, 'utf8');
        
        if (extensionContent.includes('activate') && extensionContent.includes('deactivate')) {
            console.log('✅ extension.js exports - OK');
        } else {
            console.error('❌ extension.js missing required exports');
            allTestsPassed = false;
        }
    } catch (e) {
        console.error('❌ Error reading extension.js:', e.message);
        allTestsPassed = false;
    }
    
    // Test XMake class
    try {
        const xmakePath = path.join(outDir, 'xmake.js');
        const xmakeContent = fs.readFileSync(xmakePath, 'utf8');
        
        if (xmakeContent.includes('execCommandsSequentially') && xmakeContent.includes('getConfigureArgs')) {
            console.log('✅ xmake.js new methods - OK');
        } else {
            console.error('❌ xmake.js missing new methods');
            allTestsPassed = false;
        }
    } catch (e) {
        console.error('❌ Error reading xmake.js:', e.message);
        allTestsPassed = false;
    }
    
    // Test Terminal class
    try {
        const terminalPath = path.join(outDir, 'terminal.js');
        const terminalContent = fs.readFileSync(terminalPath, 'utf8');
        
        if (terminalContent.includes('Promise<Number>') && terminalContent.includes('onDidEndTaskProcess')) {
            console.log('✅ terminal.js updated methods - OK');
        } else {
            console.error('❌ terminal.js missing updated methods');
            allTestsPassed = false;
        }
    } catch (e) {
        console.error('❌ Error reading terminal.js:', e.message);
        allTestsPassed = false;
    }
    
    if (allTestsPassed) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('\n❌ Some tests failed!');
        process.exit(1);
    }
}

runTests();
