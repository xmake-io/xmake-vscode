# Contributing

If you discover issues, have ideas for improvements or new features, or
want to contribute a new module, please report them to the
[issue tracker][1] of the repository or submit a pull request. Please,
try to follow these guidelines when you do so.

## Issue reporting

* Check that the issue has not already been reported.
* Check that the issue has not already been fixed in the latest code
  (a.k.a. `master`).
* Be clear, concise and precise in your description of the problem.
* Open an issue with a descriptive title and a summary in grammatically correct,
  complete sentences.
* Include any relevant code to the issue summary.

## Pull requests

* Use a topic branch to easily amend a pull request later, if necessary.
* Write good commit messages.
* Use the same coding conventions as the rest of the project.
* Ensure your edited codes with four spaces instead of TAB.
* Please commit code to `dev` branch and we will merge into `master` branch in feature

## Install environment

#### Prerequisites

- [Node.js](https://nodejs.org/) (>= 16)
- [Yarn](https://yarnpkg.com/) (this project uses `yarn.lock`)
- [vsce](https://github.com/microsoft/vscode-vsce) for packaging/publishing:

```console
$ npm install -g @vscode/vsce
```

#### Install dependencies

Always run this first after cloning, or when `package.json` / `yarn.lock` changes. Without it, TypeScript can't find `vscode`, `@types/node`, `iconv-lite`, etc. and the compile will fail.

```console
$ yarn install
```

#### Compile

```console
$ yarn run compile        # one-shot build
$ yarn run watch          # incremental rebuild on save
```

You can also press `F5` in VSCode to launch a development host with the extension loaded for debugging.

#### Create publisher (one-time setup)

```console
$ vsce create-publisher <publisher-name>
$ vsce login <publisher-name>
```

#### Package and publish

```console
$ ./package.sh                # produces a .vsix locally (vsce package)
$ ./publish.sh <version>      # publishes to the Marketplace (vsce publish <version>)
```

`publish.sh` runs `vsce publish <version>`, which triggers `vscode:prepublish` → `npm run compile`. If dependencies are not installed, compile will fail with hundreds of `Cannot find module 'vscode'` / `Cannot find name 'require'` errors — run `yarn install` first.

To also publish on [Open VSX](https://open-vsx.org/):

```console
$ ovsx publish --pat <token>
```

## Financial contributions

We also welcome financial contributions in full transparency on our [open collective](https://opencollective.com/xmake).
Anyone can file an expense. If the expense makes sense for the development of the community, it will be "merged" in the ledger of our open collective by the core contributors and the person who filed the expense will be reimbursed.

## Credits

### Backers

Thank you to all our backers! [[Become a backer](https://opencollective.com/xmake#backer)]

<a href="https://opencollective.com/xmake#backers" target="_blank"><img src="https://opencollective.com/xmake/backers.svg?width=890"></a>

### Sponsors

Thank you to all our sponsors! (please ask your company to also support this open source project by [becoming a sponsor](https://opencollective.com/xmake#sponsor))

<a href="https://opencollective.com/xmake/sponsor/0/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/1/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/2/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/3/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/4/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/5/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/6/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/7/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/8/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/9/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/9/avatar.svg"></a>

# 贡献代码

如果你发现一些问题，或者想新增或者改进某些新特性，或者想贡献一个新的模块
那么你可以在[issues][1]上提交反馈，或者发起一个提交代码的请求(pull request).

## 问题反馈

* 确认这个问题没有被反馈过
* 确认这个问题最近还没有被修复，请先检查下 `master` 的最新提交
* 请清晰详细地描述你的问题
* 如果发现某些代码存在问题，请在issue上引用相关代码

## 安装环境

#### 环境要求

- [Node.js](https://nodejs.org/) (>= 16)
- [Yarn](https://yarnpkg.com/)（本项目使用 `yarn.lock`）
- [vsce](https://github.com/microsoft/vscode-vsce)，用于打包和发布：

```console
$ npm install -g @vscode/vsce
```

国内网络较慢时，可以使用 cnpm 镜像：

```console
$ npm install -g cnpm --registry=https://registry.npmmirror.com
$ cnpm install -g @vscode/vsce
```

#### 安装依赖

克隆仓库后，或 `package.json` / `yarn.lock` 有变动时，先执行：

```console
$ yarn install
```

不装依赖直接编译会报一大堆 `Cannot find module 'vscode'` / `Cannot find name 'require'`，因为缺少 `@types/node`、`vscode` 等类型声明。

#### 编译

```console
$ yarn run compile        # 一次性编译
$ yarn run watch          # 监听文件变化增量编译
```

也可以在 VSCode 中按 `F5` 启动一个加载了本扩展的开发宿主窗口，方便调试。

#### 创建发布者（首次发布需要）

```console
$ vsce create-publisher <publisher-name>
$ vsce login <publisher-name>
```

#### 打包和发布

```console
$ ./package.sh                # 本地打包，生成 .vsix 文件
$ ./publish.sh <version>      # 发布到 VSCode Marketplace
```

`publish.sh` 内部会执行 `vsce publish <version>`，它会触发 `vscode:prepublish` 钩子 → `npm run compile`。如果没装依赖，编译会失败，所以发布前务必先 `yarn install`。

同时发布到 [Open VSX](https://open-vsx.org/)：

```console
$ ovsx publish --pat <token>
```

## 提交代码

* 请先更新你的本地分支到最新，再进行提交代码请求，确保没有合并冲突
* 编写友好可读的提交信息
* 请使用余工程代码相同的代码规范
* 确保提交的代码缩进是四个空格，而不是tab
* 请提交代码到`dev`分支，如果通过，我们会在特定时间合并到`master`分支上
* 为了规范化提交日志的格式，commit消息，不要用中文，请用英文描述

[1]: https://github.com/xmake-io/xmake-vscode/issues

## 支持项目

xmake项目属于个人开源项目，它的发展需要您的帮助，如果您愿意支持xmake项目的开发，欢迎为其捐赠，支持它的发展。 🙏 [[支持此项目](https://opencollective.com/xmake#backer)]

<a href="https://opencollective.com/xmake#backers" target="_blank"><img src="https://opencollective.com/xmake/backers.svg?width=890"></a>

## 赞助项目

通过赞助支持此项目，您的logo和网站链接将显示在这里。[[赞助此项目](https://opencollective.com/xmake#sponsor)]

<a href="https://opencollective.com/xmake/sponsor/0/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/1/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/2/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/3/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/4/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/5/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/6/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/7/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/8/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/xmake/sponsor/9/website" target="_blank"><img src="https://opencollective.com/xmake/sponsor/9/avatar.svg"></a>



