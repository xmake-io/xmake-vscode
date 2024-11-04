import("core.base.json")
import("core.project.config")
import("plugins.show.lists.apis", {rootdir = os.programdir()})

function main()
    config.load()

    local result = table.join(apis.description_builtin_apis(), apis.description_builtin_module_apis())
    for _, name in ipairs(apis.description_scope_apis()) do
        local splitinfo = name:split("%.")
        table.insert(result, splitinfo[2] or splitinfo[1])
    end
    result = table.unique(result)

    if json.mark_as_array then
        json.mark_as_array(result)
    end
    local localjson =  json.encode(result)

    -- denote the start of vscode information to ignore anything logging to stdout before this point
    print("__begin__")
    print(localjson)

    -- print end tag to ignore other deprecated/warnings infos
    print("__end__")
end
