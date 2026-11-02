-- imports
import("core.project.project")
import("core.project.config")
import("core.base.task")
import("core.base.json")

-- main entry
function main()
    -- load existing project config
    local config_loaded = false
    try
    {
        function()
            config.load()
            config_loaded = true
        end,
        catch
        {
            function(e)
                -- config not available, will run full config below
            end
        }
    }
    if not config_loaded then
        task.run("config", {}, {disable_dump = true})
    end

    -- discover all tests
    local result = {}
    for _, target in ipairs(project.ordertargets()) do
        local test_names = target:get("tests")
        if test_names then
            for _, name in ipairs(test_names) do
                local extra = target:extraconf("tests", name)
                local def_info = target:sourceinfo("tests", name)

                -- get source files
                local source_files = {}
                if extra and extra.files then
                    for _, file in ipairs(table.wrap(extra.files)) do
                        local abs_path = path.absolute(file, target:scriptdir())
                        table.insert(source_files, abs_path)
                    end
                else
                    for _, file in ipairs(target:sourcefiles()) do
                        local abs_path = path.absolute(file, os.projectdir())
                        table.insert(source_files, abs_path)
                    end
                end

                -- build test info
                local test_info = {
                    fullname = target:name() .. "/" .. name,
                    target = target:name(),
                    name = name,
                    sourcefiles = source_files,
                    scriptdir = target:scriptdir(),
                    targetfile = target:targetfile(),
                    group = extra and extra.group or target:get("group"),
                    config = extra or {}
                }

                if def_info then
                    test_info.definition = {
                        file = def_info.file,
                        line = def_info.line
                    }
                end

                table.insert(result, test_info)
            end
        end
    end

    -- output as JSON
    io.write("__begin__\n")
    print(json.encode(result))
    io.write("__end__\n")
end
