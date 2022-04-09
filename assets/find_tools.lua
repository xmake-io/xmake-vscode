import("lib.detect.find_tool")
import("detect.sdks.find_mingw")
import("core.base.json")

function main ()

    -- find mingw and msvc ,clang,clang++,gcc,g++
    local tools = {"gcc","clang","msvc","mingw"}
    local enabled_tools = {};
    local i = 1

    if find_mingw() then
        table.insert(enabled_tools,"mingw")
    end
    while i < 5 do
        if find_tool(tools[i]) then
            table.insert(enabled_tools,tools[i])
        end
        i = i + 1;
    end

    local localjson =  json.encode(enabled_tools)

    print(localjson)
end
