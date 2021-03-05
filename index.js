const { Story } = require('inkjs')
const { t } = require('koishi-utils')
require('./mysql')

t.set('ink.description', 'ink功能')
t.set('ink.example', '查看当前剧情 / 选项')
t.set('ink.example-choice', '选择第一个选项')
t.set('ink.hard-reset', '重置（请谨慎使用）')
t.set('ink.is-locking', ' 正处于剧情中，请等待其剧情结束。')
t.set('ink.hard-reset-confirm',
  '这将重置你的所有进度与数据，且不可挽回。请于5秒内回复 是 或 y(es) 以确认。')
t.set('ink.hard-reset-complete', '已重置。')
t.set('ink.choices', '选项：')
t.set('ink.the-end', '=== 故事结束 ===')
t.set('ink.error', '出现了一点错误，请尝试重新开始剧情。')

class PluginOptions {
  constructor(pOptions) {
    this.command = 'ink'
    this.desc = t('ink.description')
    this.filePath = './examples/intercept.ink.json'

    if (pOptions) {
      if (pOptions.command) this.command = pOptions.command
      if (pOptions.desc) this.desc = pOptions.desc
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

let storyLock = []


module.exports.name = 'ink'

module.exports.apply = (ctx, pluginOptions) => {
  let pOptions = new PluginOptions(pluginOptions)

  const storyJson = require(pOptions.filePath)

  ctx.command(`${pOptions.command} <choice>`, pOptions.desc)
    .example(`${pOptions.subcommand}  ${t('ink.example')}`)
    .example(`${pOptions.subcommand} 1  ${t('ink.example-choice')}`)
    .option('hard-reset', `-R ${t('ink.hard-reset')}`)
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
          return name + t('is-locking')
        } else {
          ch.lock = true
          ch.id = session.userId
          ch.uid = session.user.id
        }

        let story = new Story(storyJson)

        if (options && options['hard-reset']) {
          session.send(t('ink.hard-reset-confirm'))
          let ans = await session.prompt(5 * 1000)
          switch (ans) {
          case '是':
          case 'yes':
          case 'y':
            story.ResetState()
            db.saveGameData(session.user.id, story.state.toJson())
            ch.lock = false
            return t('ink.hard-reset-complete')
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
          await session.sendQueued(story.Continue())
        }

        if (story.currentChoices.length > 0) {
          let choices = t('ink.choices')
          for (let i = 0; i < story.currentChoices.length; i++) {
            choices += `\n${(i + 1)}. ${story.currentChoices[i].text}`
          }
          await session.sendQueued(choices)
        } else {
          await session.sendQueued(t('ink.the-end'))
        }

        db.saveGameData(session.user.id, story.state.toJson())
        ch.lock = false
      } catch (err) {
        console.log(err)
        return t('ink.error')
      }
    })
}