-- imports
import("core.project.config")
import("core.base.json")

-- main entry
function main ()

    -- load config
    config.load()
    
    -- denote the start of vscode information to ignore anything logging to stdout before this point
    print("__begin__")

    -- print config
    print(json.encode({
        plat = config.get("plat"),
        arch = config.get("arch"),
        mode = config.get("mode"),
        toolchain = config.get("toolchain")
    }))

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
