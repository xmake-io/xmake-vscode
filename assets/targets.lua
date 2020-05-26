-- imports
import("core.project.config")
import("core.project.project")

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
    for _, name in ipairs(names) do
        print(name) 
    end

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
