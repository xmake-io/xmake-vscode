'use strict';

export type XMakeProjectOptionValue = string | number | boolean | null | undefined;

export interface XMakeProjectOptionInfo {
    name: string;
    value?: XMakeProjectOptionValue;
    default?: XMakeProjectOptionValue;
    values?: string[];
    description?: string;
    category?: string;
    file?: string;
    line?: number;
}

export interface XMakeProjectTargetInfo {
    name: string;
    kind: string;
    group: string;
    scriptdir: string;
    files?: string[];
    file?: string;
    line?: number;
}
