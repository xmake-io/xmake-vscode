-- imports
import("core.project.config")
import("core.project.project")

-- main entry
function main ()

    -- load config
    config.load()

    -- print targets
    for name, _ in pairs((project.targets())) do 
        print(name) 
    end 

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
