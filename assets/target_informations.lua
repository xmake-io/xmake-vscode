-- imports
import("core.project.config")
import("core.project.project")
import("core.base.json")
import("private.action.run.runenvs", {try = true})
if not runenvs then
    import("private.action.run.make_runenvs")
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

function _get_path(target)
    if target then
        return path.join(os.projectdir(), target:targetfile())
    end
end

function _get_rundir(target)
    if target then
        return path.absolute(target:rundir())
    end
end

function _get_name(target)
    if target then
        return target:name()
    end
end

function _get_envs(target)
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
        return envs
    end
    return {}
end

-- main entry
function main(targetname)

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

    local infos = {}
    infos["rundir"] = _get_rundir(target)
    infos["envs"] = _get_envs(target)
    infos["path"] = _get_path(target)
    infos["name"] = _get_name(target)

    print(json.encode(infos))

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
