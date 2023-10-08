-- imports
import("core.project.config")
import("core.project.project")
import("core.base.json")
import("private.action.run.runenvs", {try = true})
if not runenvs then
    import("private.action.run.make_runenvs")
end

-- config target
function _config_target(target)
    local oldenvs = os.addenvs(target:pkgenvs())
    for _, rule in ipairs(target:orderules()) do
        local on_config = rule:script("config")
        if on_config then
            on_config(target)
        end
    end
    local on_config = target:script("config")
    if on_config then
        on_config(target)
    end
    if oldenvs then
        os.setenvs(oldenvs)
    end
end

-- config targets
function _config_targets()
    for _, target in ipairs(project.ordertargets()) do
        if target:is_enabled() then
            _config_target(target)
        end
    end
end

-- recursively target add env
function _add_target_pkgenvs(target, envs, targets_added)
    if targets_added[target:name()] then
        return
    end
    targets_added[target:name()] = true
    local pkgenvs = target:pkgenvs()
    if pkgenvs then
        os.addenvs(pkgenvs)
        for _, name in ipairs(table.keys(pkgenvs)) do
            envs[name] = os.getenv(name)
        end
    end
    for _, dep in ipairs(target:orderdeps()) do
        _add_target_pkgenvs(dep, envs, targets_added)
    end
end

-- main entry
function main (targetname)

    -- load config
    config.load()
    if not os.isfile(os.projectfile()) then
        return
    end
    _config_targets()

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

    -- get run envs
    local envs = {}
    if target then
        local oldenvs = os.getenvs()
        _add_target_pkgenvs(target, envs, {})
        local addrunenvs, setrunenvs = runenvs and runenvs.make(target) or make_runenvs(target)
        for name, values in pairs(addrunenvs) do
            os.addenv(name, table.unpack(table.wrap(values)))
            envs[name] = os.getenv(name)
        end
        for name, value in pairs(setrunenvs) do
            os.setenv(name, table.unpack(table.wrap(value)))
            envs[name] = os.getenv(name)
        end
        os.setenvs(oldenvs)
    end

    -- convert to envirnoments for vscode
    local empty = true
    local envirnoments = {}
    for k, v in pairs(envs) do
        table.insert(envirnoments, {name = k, value = v})
        empty = false
    end
    if json.mark_as_array then
        json.mark_as_array(envirnoments)
    end
    if not empty then
        print(json.encode(envirnoments))
    else
        print("[]")
    end

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
