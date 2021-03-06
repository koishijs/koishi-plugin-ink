# koishi-plugin-ink

[![npm](https://img.shields.io/npm/v/koishi-plugin-ink?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-ink)
[![npm-download](https://img.shields.io/npm/dw/koishi-plugin-ink?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-ink)

**[inkjs](https://github.com/y-lohse/inkjs)** 在 **[Koishi](https://github.com/koishijs/koishi)** 的简易应用。

## 依赖插件

这个插件需要 **Koishi v3** 版本，同时需要 **koishi-plugin-mysql** 数据库支持。

## [ink](https://github.com/inkle/ink) 是什么？

[ink](https://github.com/inkle/ink) 是一个由 [inkle](https://www.inklestudios.com/) 开发的视觉小说类脚本语言，初衷在于将更多的精力放在视觉小说故事流上，而不是程序实现上。

[inky](https://github.com/inkle/inky) 是 ink 的专用编辑器。当然，这不是说你不能用记事本写 ink，只是 inky 提供了很多方便的功能，比如即写即渲染。

[inklecate](https://github.com/inkle/ink/releasaes) 是将 ink 脚本转化为可供程序使用的 JSON 文档的编译器。它内置于 inky 中。

[inkjs](https://github.com/y-lohse/inkjs) 则是 ink 的一个 JavaScript 运行时（Runtime）实现，它读取由 inky 或 inklecate 编译好的 JSON 文件，然后对其进行控制。

## 这个插件是什么？

这个插件是 [inkjs](https://github.com/y-lohse/inkjs) 在 [Koishi](https://github.com/koishijs/koishi) 中的简易应用，实现了以下的基本功能：

- 故事的进行
- 跳转至下一个选项
- 在调用指令时自动读档，在选项处自动存档
- 硬重置
- 进程锁，在同一个频道中最多1人进行故事

## 安装方法

```shell
npm i koishi-plugin-ink
```

然后，在 **koishi.config.js** 中：

```js
module.exports = {
  plugins: [
    // your other plugins...
    'ink': {},
  ],
  // other configs...
]
```

或者在 **index.js** 中：

```js
app.plugin(require('koishi-plugin-ink'))
```

在注册插件后，插件将自动在数据库中创建名为 **ink_save** 的表，存档将储存到此表中。

## 使用方法

```
ink <choice>
```

**choice**：在有选项的时候，选择此选项。

| 可选选项           | 说明             |
| ------------------ | ---------------- |
| `-R, --hard-reset` | 重置所有进度     |
| `-s, --skip`       | 跳转至下一个选项 |

## 插件配置项

这个插件在无配置项的情况下将使用 *[The intercept](https://www.inklestudios.com/ink/theintercept/)* 作为示例小说。

| 配置项           | 默认值  | 说明                                                         |
| ---------------- | ------- | ------------------------------------------------------------ |
| `command`        | `ink`       | 插件指令 **\*1**                             |
| `filePath`     | *The intercept*   | 编译好的 `(.ink).json` 文件的相对路径 |

**\*1** 修改此配置项将将使上文中所有的 `ink` 替换为所配置的字符串。例如，配置 `command: 'sample'`  会导致指令变为 `sample` ，创建的表变为 `sample_save` ，注册的模板（后述）变为 `sample.description` 、 `sample.example` 等。

此配置项也支持设置为 Koishi 的链式子指令，但是请注意，由于使用了数据库，子指令的最后一项只能为层级式，且不能包含数据库表名不支持的字符。

例如，配置 `command: 'lorem/ipsum'` 会创建表 `ipsum_save` ，这是没有问题的；但是配置 `command: 'lorem.ipsum'` 则会出现在 `lorem` 库内创建 `ipsum_save` 表的情况，这在大多数情况下是不被期望的。

## 模板

这个插件在最初的几行定义了一些字符串：

```js
// Object templateNode
'description': 'ink功能',
'example': '查看当前剧情 / 选项',
'example-choice': '选择第一个选项',
'hard-reset': '重置（请谨慎使用）',
'skip': '跳至下一个选项',
'is-locking': ' 正处于剧情中，请等待其剧情结束。',
'is-locking-self': '当前处于剧情中，请等待剧情结束。',
'hard-reset-confirm': '这将重置你的所有进度与数据，且不可挽回。请于5秒内回复 是 或 y(es) 以确认。',
'hard-reset-complete': '已重置。',
'choices': '选项：',
'skip-to-choices': '已跳转至选项：',
'the-end': '=== 故事结束 ===',
'error': '出现了一点错误，请尝试重新开始剧情。'
```

并通过下面的方法注册为 [模板](https://koishi.js.org/api/utils.html#模板操作)  ：

```js
for (let node in templateNode) {
  t.set(`${command}.${node}`, templateNode[node])
  // command 即为配置项中的 command，默认为 ink
}
```

你可以根据自己的喜好来覆盖它们，例如：

```js
t.set('ink.error', '出了亿点点错误。')
```

## 推荐阅读

[Writing With Ink](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md) - ink 脚本的语法参考文档。

[Running Your Ink](https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md) - ink 运行时的参考文档。虽然里面使用的是 C# 实现，但是 inkjs 的大部分 API 都与之相同。

## Q&A

- 为什么在使用的时候会报“版本不对”？

当前（指在写这个 Readme 的时候）inkjs 的版本还处在 1.11.0，而对应的 ink 版本则是 0.9.0；但是最新的 ink 及 inky 版本已经到 1.0.0 了。请检查你有没有使用正确的版本进行 ink 的编译。

- 为什么不支持 koishi-plugin-mongo？

因为我不会 MongoDB。

- 这个插件和 koishi-plugin-adventure 有什么区别？

总地来说，koishi-plugin-adventure 会更加开箱即用且更加好用，因为你会想要的功能 adventure 基本都提供了。但是，如果你想尝试写长故事，或者你本来手头就有一个 ink 脚本，那么你可以试试这个。

- 为什么不支持【某个功能】（比如节点跳转）

我一开始想做这些功能，但是首先靠 ink 的合理编写是能够实现这些功能的，其次 ink 这个脚本语言的可拓展性很强。在 Runtime 应用层中，它提供标签暴露、变量暴露与存取、节点跳转以及节点访问计数。换句话来说，这些功能十万个人有十万甚至九万个实现的需求和方法，而仅仅一种实现很难满足个性化的需求。

如果想要贴合自己需求的 ink 实现，那么推荐 `Ctrl + C` 这个仓库的代码（甚至用不着 `git clone` ，因为代码量很小）然后自己修改（参见推荐阅读）。

- 发现了个bug

这很正常。