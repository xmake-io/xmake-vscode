-- imports
import("core.project.config")
import("core.platform.platform")

-- main entry
function main (plat)

    config.load()
    local archs = platform.archs(plat or config.get("plat"))
    if archs then
        for _, arch in ipairs(archs) do
            print(arch)
        end
    end

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
