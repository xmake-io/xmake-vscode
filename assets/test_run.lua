-- imports
import("core.project.project")
import("core.project.config")
import("core.base.task")
import("core.base.option")
import("core.base.json")
import("core.base.scheduler")
import("async.runjobs")

-- clean control characters from output
local function _clean_output(text)
    if not text then return "" end
    -- Keep ANSI escape codes for colored output in VSCode Test Output terminal
    -- Remove carriage returns (keep newlines)
    text = text:gsub("\r\n", "\n")
    text = text:gsub("\r", "")
    return text
end

-- run a single test, returns (passed, stdout, stderr)
local function _run_test(target, testinfo)
    local oldenvs = os.getenvs()
    local rundir = testinfo.rundir or target:rundir()
    local runargs = testinfo.runargs

    -- sandbox_os.iorunv returns stdout, stderr on success
    -- on failure, os.raise throws an error (caught by catch block)
    local proc_stdout, proc_stderr = "", ""
    local passed = true
    try
    {
        function ()
            proc_stdout, proc_stderr = os.iorunv(target:targetfile(), runargs, {curdir = rundir,
                                                                                envs = testinfo.runenvs,
                                                                                timeout = testinfo.timeout and testinfo.timeout * 1000})
        end,
        catch
        {
            function (errors)
                passed = false
                -- errors may be a table {errors=, stdout=, stderr=} or a string
                if type(errors) == "table" then
                    testinfo.errors = errors.errors or ""
                else
                    testinfo.errors = tostring(errors)
                end
            end
        }
    }

    testinfo.stdout = _clean_output(proc_stdout)
    testinfo.stderr = _clean_output(proc_stderr)
    os.setenvs(oldenvs)

    -- check pass_outputs/fail_outputs
    if passed and testinfo.pass_outputs and #testinfo.pass_outputs > 0 then
        local check_stdout = testinfo.stdout
        if testinfo.trim_output then
            check_stdout = check_stdout:trim()
        end
        for _, pattern in ipairs(table.wrap(testinfo.pass_outputs)) do
            if not check_stdout:find(pattern, 1, true) then
                passed = false
                testinfo.errors = testinfo.errors or ""
                testinfo.errors = testinfo.errors .. "not matched passed output: " .. pattern .. ", actual output: " .. check_stdout
                break
            end
        end
    end
    if passed and testinfo.fail_outputs and #testinfo.fail_outputs > 0 then
        local check_stdout = testinfo.stdout
        if testinfo.trim_output then
            check_stdout = check_stdout:trim()
        end
        for _, pattern in ipairs(table.wrap(testinfo.fail_outputs)) do
            if check_stdout:find(pattern, 1, true) then
                passed = false
                testinfo.errors = testinfo.errors or ""
                testinfo.errors = testinfo.errors .. "matched fail output: " .. pattern .. ", actual output: " .. check_stdout
                break
            end
        end
    end
    if testinfo.should_fail then
        passed = not passed
    end

    return passed
end

-- get tests
local function _get_tests(testname)
    local tests = {}
    local group_pattern = option.get("group")
    if group_pattern then
        group_pattern = "^" .. path.pattern(group_pattern) .. "$"
    end
    for _, target in ipairs(project.ordertargets()) do
        local test_names = target:get("tests")
        if test_names then
            for _, name in ipairs(test_names) do
                local extra = target:extraconf("tests", name)
                local testfullname = target:name() .. "/" .. name
                if not testname or testfullname == testname then
                    local testinfo = {name = testfullname, target = target}
                    if extra then
                        table.join2(testinfo, extra)
                    end
                    if not group_pattern or (testinfo.group and testinfo.group:match(group_pattern)) then
                        tests[testfullname] = testinfo
                    end
                end
            end
        end
    end
    return tests
end

-- main entry
function main(testname)
    -- load project config
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

    -- get tests to run
    local tests = _get_tests(testname)
    local ordertests = {}
    for _, testinfo in pairs(tests) do
        table.insert(ordertests, testinfo)
    end

    if #ordertests == 0 then
        io.write("__begin__\n")
        print(json.encode({error = "no tests found", tests = {}}))
        io.write("__end__\n")
        return
    end

    -- run tests
    local spent = os.mclock()
    local report = {passed = 0, total = #ordertests, tests = {}}
    local jobs = tonumber(option.get("jobs")) or os.default_njob()

    runjobs("run_tests", function (index, total, opt)
        local testinfo = ordertests[index]
        if testinfo then
            local target = testinfo.target
            testinfo.target = nil
            local test_spent = os.mclock()
            local passed = _run_test(target, testinfo)
            test_spent = os.mclock() - test_spent
            if passed then
                report.passed = report.passed + 1
            end
            table.insert(report.tests, {
                target = target:name(),
                name = testinfo.name,
                passed = passed,
                spent = test_spent,
                should_fail = testinfo.should_fail or false,
                stdout = testinfo.stdout,
                stderr = testinfo.stderr,
                errors = testinfo.errors
            })
        end
    end, {total = #ordertests,
          comax = jobs,
          isolate = true,
          progress_refresh = false})

    -- generate report
    spent = os.mclock() - spent
    report.spent = spent
    report.passed_rate = math.floor(report.passed * 100 / report.total)

    -- output as JSON
    io.write("__begin__\n")
    print(json.encode(report))
    io.write("__end__\n")
end
