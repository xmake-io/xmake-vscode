-- imports
import("core.project.config")
import("core.project.project")
import("core.platform.platform")

function main (plat)

    config.load()
    local modes = project.modes() or {"release", "debug"}
    if modes then
        for _, mode in ipairs(modes) do
            print(mode)
        end
    end

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
