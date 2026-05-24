-- imports
import("actions.create.template", {rootdir = os.programdir()})

-- main entry
function main(lang)
    local templates = {}
    for _, t in ipairs(template.templates(lang or "c++")) do
        print(t)
    end
end
