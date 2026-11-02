'use strict';

import * as vscode from 'vscode';
import { log } from './log';
import { TEST_MACRO_PATTERNS, normalizeTestName } from './testMacroPatterns';
import { getDiscoveredTests, TestLocation, onTestsChanged } from './testRunner';

interface CachedLocations {
    documentVersion: number;
    timestamp: number;
    locations: TestLocation[];
}

/**
 * Provides CodeLens entries for running and debugging tests directly from the editor.
 * Shows inline "Run" and "Debug" buttons at test definition locations.
 */
export class XMakeTestCodeLensProvider implements vscode.CodeLensProvider {
    private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

    // Cache test locations by normalized file path
    private testLocationCache: Map<string, CachedLocations> = new Map();
    private readonly CACHE_VALIDITY_MS = 2000;

    constructor() {
        // Watch for test changes to invalidate cache
        onTestsChanged(() => {
            this.testLocationCache.clear();
            this.onDidChangeCodeLensesEmitter.fire();
        });
    }

    public provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.CodeLens[] {
        const language = document.languageId;
        if (!['cpp', 'c', 'hpp', 'h'].includes(language)) {
            return [];
        }

        try {
            const testLocations = this.getTestLocationsForDocument(document);

            if (token.isCancellationRequested) {
                return [];
            }

            const codeLenses: vscode.CodeLens[] = [];
            for (const testLoc of testLocations) {
                const range = new vscode.Range(
                    new vscode.Position(testLoc.line, 0),
                    new vscode.Position(testLoc.line, 0)
                );

                // Run button
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '$(run) Run',
                    command: 'xmake.testRunFromCodeLens',
                    arguments: [{ testName: testLoc.testName, sourceFile: testLoc.sourceFile }]
                }));

                // Debug button
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '$(debug) Debug',
                    command: 'xmake.testDebugFromCodeLens',
                    arguments: [{ testName: testLoc.testName, sourceFile: testLoc.sourceFile }]
                }));
            }

            return codeLenses;
        } catch (err) {
            log.error(`Error in provideCodeLenses: ${err}`);
            return [];
        }
    }

    public resolveCodeLens(
        codeLens: vscode.CodeLens,
        token: vscode.CancellationToken
    ): vscode.CodeLens {
        // No lazy resolution needed
        return codeLens;
    }

    /**
     * Get test locations for a specific document
     */
    private getTestLocationsForDocument(document: vscode.TextDocument): TestLocation[] {
        const filePath = this.normalizePath(document.uri.fsPath);
        const now = Date.now();

        // Check cache
        const cached = this.testLocationCache.get(filePath);
        if (cached &&
            cached.documentVersion === document.version &&
            (now - cached.timestamp) < this.CACHE_VALIDITY_MS) {
            return cached.locations;
        }

        // Get discovered test metadata
        const discoveredTests = getDiscoveredTests();
        const metaLocations: TestLocation[] = [];
        const knownTestNames = new Set<string>();

        // Find tests that belong to this source file
        for (const test of discoveredTests) {
            knownTestNames.add(test.fullname);

            for (const sourceFile of test.sourcefiles) {
                if (this.normalizePath(sourceFile) === filePath) {
                    metaLocations.push({
                        testName: test.fullname,
                        targetName: test.target,
                        line: test.definition?.line ? test.definition.line - 1 : -1,
                        sourceFile: sourceFile,
                        definitionFile: test.definition?.file,
                        definitionLine: test.definition?.line
                    });
                    break;
                }
            }
        }

        // Find test macros in source file
        const macroLocations = this.findTestMacroLocations(document, knownTestNames);

        // If no macro patterns matched but this file has discovered tests,
        // fall back to placing CodeLens at the main() function
        let resolvedLocations: TestLocation[];
        if (macroLocations.length === 0 && metaLocations.length > 0) {
            const mainLocation = this.findMainFunctionLocation(document, metaLocations);
            resolvedLocations = mainLocation ? [mainLocation] : metaLocations;
        } else {
            // Merge results (macro locations take priority for exact line numbers)
            resolvedLocations = this.mergeLocations(metaLocations, macroLocations);
        }

        // Deduplicate
        const dedupedLocations = this.deduplicateLocations(resolvedLocations);

        // Cache results
        this.testLocationCache.set(filePath, {
            documentVersion: document.version,
            timestamp: now,
            locations: dedupedLocations
        });

        return dedupedLocations;
    }

    /**
     * Find main function location as a fallback for CodeLens position
     */
    private findMainFunctionLocation(document: vscode.TextDocument, metaLocations: TestLocation[]): TestLocation | null {
        const text = document.getText();

        // Match main function
        const mainRegex = /\bmain\s*\(/;
        const match = text.match(mainRegex);
        if (!match) return null;

        const position = document.positionAt(match.index);
        const line = position.line;

        // Use the first meta location's testName (or combine all into a descriptive one)
        const testName = metaLocations.length === 1
            ? metaLocations[0].testName
            : `${metaLocations[0].targetName} (${metaLocations.length} tests)`;

        return {
            testName,
            targetName: metaLocations[0]?.targetName || '',
            line,
            sourceFile: document.uri.fsPath
        };
    }

    /**
     * Find test macro locations in source file
     */
    private findTestMacroLocations(
        document: vscode.TextDocument,
        knownTestNames: Set<string>
    ): TestLocation[] {
        const text = document.getText();
        const locations: TestLocation[] = [];

        // Build lookup from discovered names: normalized macro name → fullname
        const macroToDiscovered = new Map<string, string>();
        for (const fullname of knownTestNames) {
            const macroPart = fullname.includes('/') ? fullname.split('/').slice(1).join('/') : fullname;
            macroToDiscovered.set(normalizeTestName(macroPart), fullname);
        }

        // Apply all test macro patterns
        for (const pattern of TEST_MACRO_PATTERNS) {
            pattern.regex.lastIndex = 0;
            let match: RegExpExecArray | null;

            while ((match = pattern.regex.exec(text)) !== null) {
                const macroName = pattern.extractName(match);

                // Try to map macro-extracted name to a discovered fullname (best effort)
                // This lets findTestItemByName find it via exact id match in the controller
                let displayName = macroName;
                if (knownTestNames.size > 0) {
                    if (knownTestNames.has(macroName)) {
                        displayName = macroName;
                    } else {
                        const normMacro = normalizeTestName(macroName);
                        const matched = macroToDiscovered.get(normMacro);
                        if (matched) {
                            displayName = matched;
                        }
                    }
                }

                const position = document.positionAt(match.index);
                locations.push({
                    testName: displayName,
                    targetName: '',
                    line: position.line,
                    sourceFile: document.uri.fsPath
                });
            }
        }

        return locations;
    }

    /**
     * Merge metadata locations and macro locations (cmake-style strategy)
     * - Macro locations take priority for exact line numbers
     * - Metadata locations are kept as fallback for tests not found by regex
     */
    private mergeLocations(
        metaLocations: TestLocation[],
        macroLocations: TestLocation[]
    ): TestLocation[] {
        const validMacroLocations = macroLocations.filter(l => l.line >= 0);
        const validMetaLocations = metaLocations.filter(l => l.line >= 0);

        if (validMacroLocations.length === 0) {
            return validMetaLocations;
        }

        // Keep meta locations whose test name is NOT already covered by a macro location
        const macroNames = new Set(validMacroLocations.map(l => l.testName));
        const unmatchedMeta = validMetaLocations.filter(l => !macroNames.has(l.testName));

        return [...unmatchedMeta, ...validMacroLocations];
    }

    /**
     * Deduplicate locations by testName:line
     */
    private deduplicateLocations(locations: TestLocation[]): TestLocation[] {
        const deduped = new Map<string, TestLocation>();
        for (const location of locations) {
            const key = `${location.testName}:${location.line}`;
            if (!deduped.has(key)) {
                deduped.set(key, location);
            }
        }
        return Array.from(deduped.values()).sort((a, b) => a.line - b.line);
    }

    /**
     * Normalize path for cross-platform comparison
     */
    private normalizePath(filePath: string): string {
        return filePath.toLowerCase().replace(/\\/g, '/');
    }

    dispose() {
        this.onDidChangeCodeLensesEmitter.dispose();
    }
}
