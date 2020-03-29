-- imports
import("core.project.config")
import("core.project.project")

-- main entry
function main (targetname)

    -- load config
    config.load()
    if not os.isfile(os.projectfile()) then
        return
    end

    -- get target
    local target = nil
    if targetname then
        target = project.target(targetname)
    end
    if not target then
        for _, t in pairs(project.targets()) do
            local default = t:get("default")
            if (default == nil or default == true) and t:get("kind") == "binary" then
                target = t
                break
            end
        end
    end

    -- get run directory
    if target then
        print(path.absolute(target:rundir()))
    end

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
