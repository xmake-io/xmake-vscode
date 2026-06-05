import("core.project.config")
import("core.project.project")
import("core.base.json")

function _stringify_option_value(value)
    if value == nil then
        return nil
    end
    if type(value) == "table" then
        local values = {}
        for _, item in ipairs(value) do
            table.insert(values, tostring(item))
        end
        return table.concat(values, "\n")
    end
    return tostring(value)
end

function _stringify_option_list(value)
    if value == nil then
        return nil
    end
    if type(value) ~= "table" then
        return {_stringify_option_value(value)}
    end
    local values = {}
    for _, item in ipairs(value) do
        table.insert(values, _stringify_option_value(item))
    end
    return #values > 0 and values or nil
end

function _collect_xmake_files()
    local root = os.projectdir()
    local candidates = {}
    for _, filepath in ipairs(os.files(path.join(root, "xmake.lua"))) do
        table.insert(candidates, filepath)
    end
    for _, filepath in ipairs(os.files(path.join(root, "**", "xmake.lua"))) do
        table.insert(candidates, filepath)
    end

    local visited = {}
    local files = {}
    for _, filepath in ipairs(candidates) do
        local normalized = filepath:gsub("\\", "/")
        if not visited[filepath] and not normalized:find("/%.xmake/") then
            visited[filepath] = true
            table.insert(files, filepath)
        end
    end
    return files
end

function _find_definition_locations(kind)
    local locations = {}
    local files = _collect_xmake_files()
    local double_quote_pattern = '^%s*' .. kind .. '%s*%(?%s*"([^"]+)"'
    local single_quote_pattern = "^%s*" .. kind .. "%s*%(?%s*'([^']+)'"

    for _, filepath in ipairs(files) do
        local line_number = 0
        for line in io.lines(filepath) do
            line_number = line_number + 1
            local name = line:match(double_quote_pattern) or line:match(single_quote_pattern)
            if name and not locations[name] then
                locations[name] = {
                    file = filepath,
                    line = line_number
                }
            end
        end
    end
    return locations
end

function main ()
    config.load()
    local option_locations = _find_definition_locations("option")
    local target_locations = _find_definition_locations("target")

    -- read all the files from the target
    local explorer_targets = {}
    for name, target in pairs((project.targets())) do
        local explorer_target = {}
        explorer_target.name = name
        explorer_target.kind = target:kind()
        explorer_target.scriptdir = target:scriptdir()
        local location = target_locations[name]
        if location then
            explorer_target.file = location.file
            explorer_target.line = location.line
        end

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
            local showmenu = option:showmenu()
            show = showmenu ~= false
        else
            local showmenu = option:get("showmenu")
            show = showmenu ~= false
        end
        if show then
            explorer_option.name = name
            local default = option:get("default")
            local value = option:value()
            if value == nil then
                value = default
            end
            explorer_option.value = _stringify_option_value(value)
            explorer_option.default = _stringify_option_value(default)
            explorer_option.description = _stringify_option_value(option:get("description"))
            explorer_option.category = _stringify_option_value(option:get("category"))
            local location = option_locations[name]
            if location then
                explorer_option.file = location.file
                explorer_option.line = location.line
            end

            local values = option:get("values")
            local explorer_option_values = _stringify_option_list(values)
            if explorer_option_values then
                explorer_option.values = explorer_option_values
            end
            table.insert(explorer_options, explorer_option)
        end
    end

    -- print explorer data
    if json.mark_as_array then
        if explorer_targets then
            json.mark_as_array(explorer_targets)
        end
        if explorer_options then
            json.mark_as_array(explorer_options)
        end
    end
    local explorer_data = {targets = explorer_targets, options = explorer_options}
    local jsondata = json.encode(explorer_data)
    print(jsondata)
end
