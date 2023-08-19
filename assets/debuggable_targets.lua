-- imports
import("core.project.config")
import("core.project.project")
import("core.base.json")

function main ()

    -- load config
    config.load()

    -- print targets
    local names = {}
    for name, target in pairs((project.targets())) do
        if target:is_binary() then
            table.insert(names, name)
        end
    end
    table.sort(names)
    if json.mark_as_array then
        json.mark_as_array(names)
    end
    local localjson =  json.encode(names)
    print(localjson)

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
