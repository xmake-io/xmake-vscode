-- imports
import("core.project.config")
import("core.project.project")
import("core.base.json")

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

    -- get run arguments
    local args = table.wrap(target and target:get("runargs"))
    print("__begin__")
    print(#args > 0 and json.encode(args) or "[]")
    print("__end__")
end