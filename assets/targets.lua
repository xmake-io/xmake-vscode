-- imports
import("core.project.config")
import("core.project.project")
import("core.base.json")

-- main entry
function main ()

    -- load config
    config.load()

    -- print targets
    local names = {}
    for name, _ in pairs((project.targets())) do
        table.insert(names, name)
    end
    table.sort(names)
    if json.mark_as_array then
        json.mark_as_array(names)
    end
    local localjson =  json.encode(names)

    -- denote the start of vscode information to ignore anything logging to stdout before this point
    print("__begin__")
    print(localjson)

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
