const fs = require('fs');
const path = require('path');

// Simple test to verify TypeScript compilation
describe('TypeScript Compilation', () => {
    test('Should compile without errors', () => {
        const outDir = path.join(__dirname, '../out');
        
        // Check if main output files exist
        const mainFiles = [
            'extension.js',
            'xmake.js',
            'terminal.js',
            'process.js'
        ];
        
        mainFiles.forEach(file => {
            const filePath = path.join(outDir, file);
            expect(fs.existsSync(filePath)).toBe(true);
            
            // Check file is not empty
            const content = fs.readFileSync(filePath, 'utf8');
            expect(content.length).toBeGreaterThan(0);
        });
    });
    
    test('Should have proper exports in extension.js', () => {
        const extensionPath = path.join(__dirname, '../out/extension.js');
        const content = fs.readFileSync(extensionPath, 'utf8');
        
        // Check for key exports
        expect(content).toContain('activate');
        expect(content).toContain('deactivate');
    });
    
    test('Should have XMake class in xmake.js', () => {
        const xmakePath = path.join(__dirname, '../out/xmake.js');
        const content = fs.readFileSync(xmakePath, 'utf8');
        
        // Check for key methods
        expect(content).toContain('class XMake');
        expect(content).toContain('execCommandsSequentially');
        expect(content).toContain('getConfigureArgs');
    });
    
    test('Should have updated Terminal class', () => {
        const terminalPath = path.join(__dirname, '../out/terminal.js');
        const content = fs.readFileSync(terminalPath, 'utf8');
        
        // Check for updated methods that return exit codes
        expect(content).toContain('Promise<Number>');
        expect(content).toContain('onDidEndTaskProcess');
    });
});
