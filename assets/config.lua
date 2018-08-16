-- imports
import("core.project.config")

-- main entry
function main ()

    -- load config
    config.load()

    -- print config
    print("{\"plat\":\"$(plat)\", \"arch\":\"$(arch)\", \"mode\":\"$(mode)\"}")

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
