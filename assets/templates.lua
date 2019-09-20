-- imports
import("core.project.template")

-- main entry
function main(lang)
    local templates = {}
    for _, t in ipairs(template.templates(lang or "c++")) do
        if type(t.name) == "function" then
            table.insert(templates, t:name())
        else
            table.insert(templates, t.name)
        end
    end
    table.sort(templates)
    for _, t in ipairs(templates) do
        print(t)
    end
end
