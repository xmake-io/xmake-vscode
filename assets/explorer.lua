import("core.project.config")
import("core.project.project")
import("core.base.json")

function main ()
    config.load()

    -- read all the files from the target
    local explorer_targets = {}
    for name, target in pairs((project.targets())) do
        local explorer_target = {}
        explorer_target.name = name
        explorer_target.kind = target:kind()
        explorer_target.scriptdir = target:scriptdir()

        local group = target:get("group")
        if group then
            explorer_target.group = group
        else
            explorer_target.group = ""
        end

        if not target:is_phony() then
            local explorer_files = {}
            for _, headerfile in pairs(target:headerfiles()) do
                table.insert(explorer_files, headerfile)
            end
            for _, sourcefile in pairs(target:sourcefiles()) do
                table.insert(explorer_files, sourcefile)
            end
            explorer_target.files = explorer_files
        end
        table.insert(explorer_targets, explorer_target)
    end

    -- read all the options from the target
    local explorer_options = {}
    for name, option in pairs((project.options())) do
        local explorer_option = {}
        local show
        if option.showmenu then
            showmenu = option:showmenu()
            show = showmenu ~= false
        else
            show = option:get("showmenu")
        end
        if show then
            explorer_option.name = name
            explorer_option.value = option:value() or option:get("default")

            local explorer_option_values = {}
            for _, value in ipairs(option:get("values")) do
                table.insert(explorer_option_values, value)
            end
            if #explorer_option_values > 0 then
                explorer_option.values = explorer_option_values
            end
            table.insert(explorer_options, explorer_option)
        end
    end

    -- print explorer data
    local explorer_data = {targets = explorer_targets, options = explorer_options}
    local jsondata = json.encode(explorer_data)
    print(jsondata)
end
