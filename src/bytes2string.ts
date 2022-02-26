//convert bytes to string

export function bytes2string(bytes: Uint8Array): string {
    
    const os = require('os');
    const iconv = require("iconv-lite");

    const isWin = os.platform() === 'win32';
    var charset = 'utf8';
    if(isWin)
    {
        charset = 'gbk';
    }
   
    return iconv.decode(bytes, charset).toString("utf8");
}

