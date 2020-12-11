import("detect.sdks.find_mingw")
import("lib.detect.find_tool")

function main ()
    local paths = {}
    if is_host("windows") then
        local mingw = find_mingw()
        if mingw and mingw.bindir then
            table.insert(paths, mingw.bindir)
        end
    end
    local gdb = find_tool("gdb", {norun = true, paths = paths})
    if gdb and gdb.program then
        local program = gdb.program
        if is_host("windows") and not program:endswith(".exe") then
            program = program .. ".exe"
        end
        if os.isfile(program) then
            print(program)
        end
    end
end
