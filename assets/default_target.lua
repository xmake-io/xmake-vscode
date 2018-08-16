-- imports
import("core.project.config")
import("core.project.project")

-- main entry
function main ()

    -- load config
    config.load()

    -- print targets
    for _, target in pairs(project.targets()) do
        local default = target:get("default")
        if (default == nil or default == true) and target:get("kind") == "binary" then
            print(target:name()) 
        end
    end

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
