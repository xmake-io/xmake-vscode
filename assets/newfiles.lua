function main()
    for _, filedir in ipairs(os.dirs(path.join(os.scriptdir(), "newfiles", "*", "*"))) do
        print(path.relative(filedir, path.join(os.scriptdir(), "newfiles")))
    end
end
