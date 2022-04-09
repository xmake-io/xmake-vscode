import("lib.detect.find_tool")
import("core.project.project")
import("detect.sdks.find_mingw")

function main (arg)
    -- find mingw and msvc ,clang,clang++,gcc,g++
    local tools = {"gcc","clang","msvc","mingw"}
    local i = 1
    local enable_tools = ""
    if find_mingw() then
        enable_tools = enable_tools.."\"".."mingw".."\","
    end
    while i < 4 do 
        if find_tool(tools[i]) then
            enable_tools = enable_tools.."\""..tools[i].."\","
        end
        i = i + 1;
    end
    enable_tools = string.sub(enable_tools,0,-2)
    -- auto write a json file named xmake-tools-kits.json in project.directory
    --[[
        example:xmake-tools-kits.json
        {
            "tools-kits"=["mingw","msvc","clang","clang++"]
        }
    ]]
    local fileName = arg.."/".."xmake-tools-kits.json"
    local content = "{\n".."\"tools_kits\":["..enable_tools.."]\n".."}"
    local f = assert( io.open( fileName, 'w')) --根据需要读写的文家目录去写入文件
    f:write( content )
    f:close()
end

