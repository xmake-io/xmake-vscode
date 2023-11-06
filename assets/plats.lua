-- imports=
import("core.platform.platform")

-- main entry
function main ()

    local plats = platform.plats()
    if plats then
        for _, plat in ipairs(plats) do
            print(plat)
        end
    end

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
