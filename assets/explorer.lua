-- imports
import("core.project.config")
import("core.project.project")

-- main entry
function main ()

    -- load config
    config.load()
    -- config.dump()

    -- local f = io.open("project.txt", "w")
    -- local original_output = io.output()
    -- io.output(f)
    -- print(project.options())
    -- io.output(original_output)

    print("{")
    print("  \"targets\":[")

    -- print targets

    local first_target = true
    for name, target in pairs((project.targets())) do
        
        if not first_target then
            print("   ,{")
        else
            print("    {")
            first_target = false
        end

        print("      \"name\":\"%s\",", name)
        print("      \"kind\":\"%s\",", target:kind())

        local scriptdir = os.args(target:scriptdir(), {escape = true, nowrap = true})
        print("      \"scriptdir\":\"%s\",", scriptdir)

        -- add the group

        local group = target:get("group")
        if group then
            print("      \"group\":\"%s\",", group)
        else
            print("      \"group\":\"\",")
        end

        -- add all the source files
        print("      \"files\":[")

        if not target:is_phony() then

            local first_file = true
            
            for _, headerfile in pairs(target:headerfiles()) do
                local escaped_headerfile = os.args(headerfile, {escape = true, nowrap = true})
                if not first_file then
                    print("       ,\"%s\"", escaped_headerfile)
                else
                    print("        \"%s\"", escaped_headerfile)
                end

                first_file = false
            end

            for _, sourcefile in pairs(target:sourcefiles()) do
                local escaped_sourcefile = os.args(sourcefile, {escape = true, nowrap = true})
                
                if not first_file then
                    print("       ,\"%s\"", escaped_sourcefile)
                else
                    print("        \"%s\"", escaped_sourcefile)
            
                end
                
                first_file = false
            end

        end

        print("      ]")
        print("    }")
    end 

    print("  ],")

    -- add options

    local first_option = true
    print("  \"options\":[")

    for name, option in pairs((project.options())) do
        if option:get("showmenu") then

            if not first_option then
                print("   ,{")
                first_option = false
            else
                print("    {")
                first_option = false
            end 

            print("      \"name\":\"%s\",", name)
            print("      \"value\":\"%s\",", config.get(name))

            print("      \"values\":[")

            local first_value = true
            for _, value in ipairs(option:get("values")) do
                if not first_value then
                    print("       ,\"%s\"", value)
                else
                    print("        \"%s\"", value)
                    first_value = false
                end
            end

            print("      ]")
            
            print("    }")
        end
    end

    print("  ]");

    print("}")
end
