//convert bytes to string

/**
 * Check whether a buffer contains valid UTF-8 byte sequences.
 * Incomplete multi-byte sequences at the end of the buffer are treated as valid.
 */
function isValidUtf8(buffer: Buffer): boolean {
    let i = 0;
    while (i < buffer.length) {
        const byte = buffer[i];
        if (byte <= 0x7F) {
            i += 1;
        } else if (byte >= 0xC2 && byte <= 0xDF) {
            if (i + 1 >= buffer.length) return true;
            if (buffer[i + 1] < 0x80 || buffer[i + 1] > 0xBF) return false;
            i += 2;
        } else if (byte >= 0xE0 && byte <= 0xEF) {
            if (i + 1 >= buffer.length) return true;
            const b1 = buffer[i + 1];
            if (b1 < 0x80 || b1 > 0xBF) return false;
            if (byte === 0xE0 && b1 < 0xA0) return false;
            if (byte === 0xED && b1 > 0x9F) return false;
            if (i + 2 >= buffer.length) return true;
            if (buffer[i + 2] < 0x80 || buffer[i + 2] > 0xBF) return false;
            i += 3;
        } else if (byte >= 0xF0 && byte <= 0xF4) {
            if (i + 1 >= buffer.length) return true;
            const b1 = buffer[i + 1];
            if (b1 < 0x80 || b1 > 0xBF) return false;
            if (byte === 0xF0 && b1 < 0x90) return false;
            if (byte === 0xF4 && b1 > 0x8F) return false;
            if (i + 2 >= buffer.length) return true;
            if (buffer[i + 2] < 0x80 || buffer[i + 2] > 0xBF) return false;
            if (i + 3 >= buffer.length) return true;
            if (buffer[i + 3] < 0x80 || buffer[i + 3] > 0xBF) return false;
            i += 4;
        } else {
            return false;
        }
    }
    return true;
}

export function bytes2string(bytes: Uint8Array): string {
    
    const os = require('os');
    const iconv = require("iconv-lite");

    const isWin = os.platform() === 'win32';
    const fallbackCharset = isWin ? 'gbk' : 'utf8';
   
    // Try UTF-8 first, fall back to system encoding if not valid UTF-8
    const buf = Buffer.from(bytes);
    if (isValidUtf8(buf)) {
        return iconv.decode(buf, 'utf8');
    }
    return iconv.decode(buf, fallbackCharset);
}

