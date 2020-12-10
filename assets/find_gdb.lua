import("lib.detect.find_tool")

function main ()
    local paths = {}
    if is_subhost("msys") then
        local mingw_prefix = os.getenv("MINGW_PREFIX")
        if mingw_prefix then
            table.insert(paths, path.join(mingw_prefix, "bin"))
        end
    end
    local gdb = find_tool("gdb", {norun = true, paths = paths})
    if gdb and gdb.program then
        print(gdb.program)
    end
end
