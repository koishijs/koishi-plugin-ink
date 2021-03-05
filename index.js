const { Story } = require('inkjs')
require('./mysql')

const find = (arr, pred) => {
  let res
  arr.forEach(item => pred(item) ? res = item : 0)
  return res
}

let storyLock = []

module.exports.name = 'ink'

module.exports.apply = (ctx, pluginOptions) => {
  let pOptions = {
    command: 'ink',
    desc: 'inkjs功能',
    filePath: './examples/intercept.ink.json',
    ...pluginOptions
  }

  const storyJson = require(pOptions.filePath)

  ctx.command(`${pOptions.command} <choice>`, pOptions.desc)
    .example(`${pOptions.command}  查看当前剧情 / 选项`)
    .example(`${pOptions.command} 1  选择第一个选项`)
    .option('hard-reset', '-R 重置（请谨慎使用）')
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
          return `${name} 正处于剧情中，请等待其剧情结束。`
        } else {
          ch.lock = true
          ch.ud = session.userId
          ch.uid = session.user.id
        }

        let story = new Story(storyJson)

        if (options && options['hard-reset']) {
          session.send('这将重置你的所有数据与进度，且不可挽回。'
            + '请于5秒内回复 是 或 y(es) 以确认。')
          let ans = await session.prompt(5 * 1000)
          switch (ans) {
          case '是':
          case 'yes':
          case 'y':
            story.ResetState()
            db.saveGameData(session.user.id, story.state.toJson())
            ch.lock = false
            return '已重置。'
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
          let choices = '选项：'
          for (let i = 0; i < story.currentChoices.length; i++) {
            choices += `\n${(i + 1)}. ${story.currentChoices[i].text}`
          }
          await session.sendQueued(choices)
        } else {
          await session.sendQueued('THE END')
        }

        db.saveGameData(session.user.id, story.state.toJson())
        ch.lock = false
      } catch (err) {
        console.log(err)
        return '出现了一点错误，请尝试重新开始剧情。'
      }
    })
}