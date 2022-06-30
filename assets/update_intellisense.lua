-- imports
import("core.project.config")
import("clang.compile_commands", {rootdir = path.join(os.programdir(), "plugins", "project")})

-- main entry
function main(compileCommandsDirectory)

    -- generate compile_commands.json
    -- @note we can only load configuration because we watched onFileChanged(xmake.conf)
    os.setenv("XMAKE_IN_PROJECT_GENERATOR", "true")
    config.load()
    compile_commands.make(compileCommandsDirectory or ".vscode")
    os.setenv("XMAKE_IN_PROJECT_GENERATOR", nil)
end
