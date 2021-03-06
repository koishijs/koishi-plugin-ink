const { Story } = require('inkjs')
const { t } = require('koishi-utils')
const extendMysql = require('./mysql')

class PluginOptions {
  constructor(pOptions) {
    this.command = 'ink'
    this.filePath = './examples/intercept.ink.json'

    if (pOptions) {
      if (pOptions.command) this.command = pOptions.command
      if (pOptions.filePath) this.filePath = './../../' + pOptions.filePath
    }

    let subcommand = pOptions.command.match(/\/([^/]+?)$/g)
    if (subcommand) this.subcommand = subcommand[0]
    else this.subcommand = pOptions.command
  }
}

const find = (arr, pred) => {
  let res
  arr.forEach(item => pred(item) ? res = item : 0)
  return res
}

const templateNode = {
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
}

let storyLock = []

module.exports.name = 'ink'

module.exports.apply = (ctx, pluginOptions) => {
  let pOptions = new PluginOptions(pluginOptions)
  let command = pOptions.command
  extendMysql(pOptions.subcommand)

  for (let node in templateNode) {
    t.set(`${command}.${node}`, templateNode[node])
  }

  const storyJson = require(pOptions.filePath)

  ctx.command(command + ' <choice>', t(`${command}.description`))
    .example(pOptions.subcommand + '  ' + t(`${command}.example`))
    .example(pOptions.subcommand + ' 1  ' + t(`${command}.example-choice`))
    .option('hard-reset', '-R ' + t(`${command}.hard-reset`))
    .option('skip', '-s ' + t(`${command}.skip`))
    .userFields(['id'])
    .action(async ({ session, options }, choice) => {
      try {
        let db = session.database
        let bot = session.bot

        let ch = find(storyLock, o => o.channel == session.channelId)
        if (!ch) {
          storyLock.push({
            channel: session.channelId,
            lock: true,
            id: session.userId,
            uid: session.user.id
          })
          ch = storyLock[storyLock.length - 1]
        } else if (ch.lock && ch.uid != session.user.id) {
          let currentUser = await bot.getGroupMember(session.channelId, ch.id)
          let name = currentUser.nickname || currentUser.username
          return name + t(`${command}.is-locking`)
        } else if (ch.lock && ch.uid == session.user.id) {
          if (options.skip) {
            ch.skipping = true
          } else {
            return t(`${command}.is-locking-self`)
          }
        } else {
          ch.lock = true
          ch.id = session.userId
          ch.uid = session.user.id
        }

        let story = new Story(storyJson)

        if (options['hard-reset']) {
          session.send(t(`${command}.hard-reset-confirm`))
          let ans = await session.prompt(5 * 1000)
          switch (ans) {
          case '是':
          case 'yes':
          case 'y':
            story.ResetState()
            db.saveGameData(session.user.id, story.state.toJson())
            ch.lock = false
            return t(`${command}.hard-reset-complete`)
          default:
            ch.lock = false
            return
          }
        }

        let save = await db.loadGameData(session.user.id)
        if (!save) story.ResetState()
        else story.state.LoadJson(save)

        if (story.currentChoices.length > 0 && choice) {
          let userChoice = parseInt(options.choose)
          if (isNaN(userChoice)) userChoice = 0
          else userChoice -= 1
          story.ChooseChoiceIndex(userChoice)
        }

        while (story.canContinue) {
          if (options.skip) story.Continue()
          else {
            session.send(story.Continue())
            let skip = await session.prompt(session.app.options.delay.message)
            switch (skip) {
            case '-s':
            case '--skip':
            case 'skip':
            case '跳过':
              options.skip = true
              break
            }
          }
        }

        if (story.currentChoices.length > 0) {
          let choices = options.skip
            ? t(`${command}.skip-to-choices`)
            : t(`${command}.choices`)
          for (let i = 0; i < story.currentChoices.length; i++) {
            choices += `\n${(i + 1)}. ${story.currentChoices[i].text}`
          }
          await session.sendQueued(choices)
        } else {
          await session.sendQueued(t(`${command}.the-end`))
        }

        db.saveGameData(session.user.id, story.state.toJson())
        ch.lock = false
      } catch (err) {
        console.log(err)
        return t(`${command}.error`)
      }
    })
}