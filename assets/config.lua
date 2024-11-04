-- imports
import("core.project.config")

-- main entry
function main ()

    -- load config
    config.load()
    
    -- denote the start of vscode information to ignore anything logging to stdout before this point
    print("__begin__")

    -- print config
    print("{\"plat\":\"$(plat)\", \"arch\":\"$(arch)\", \"mode\":\"$(mode)\"}")

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
