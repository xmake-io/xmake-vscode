import("core.tool.toolchain")
import("core.base.text")
import("core.project.config")
import("core.project.project")
import("core.base.json")

-- show all toolchains
function main()

    config.load()
    local tbl = {align = 'l', sep = "        "}
    for _, name in ipairs(toolchain.list()) do
        local t = os.isfile(os.projectfile()) and project.toolchain(name) or toolchain.load(name)
        table.insert(tbl, {name, t:get("description")})
    end
    local localjson =  json.encode(tbl)
    print(localjson)
end
