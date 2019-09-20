-- imports
import("core.project.template")

-- main entry
function main()
    local languages = {}
    for _, l in ipairs(template.languages()) do
        table.insert(languages, l)
    end
    table.sort(languages)
    for _, l in ipairs(languages) do
        print(l)
    end
end
