import("core.base.json")
import("core.tool.toolchain")
-- show all toolchains
function main()

    local toolchains = {}
    for _, name in ipairs(toolchain.list()) do
        local t = os.isfile(os.projectfile()) and project.toolchain(name) or toolchain.load(name)
        table.insert(toolchains, {name, t:get("description")})
    end
    local localjson =  json.encode(toolchains)
    print(localjson)
end
