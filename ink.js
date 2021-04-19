const { Story } = require('inkjs')
const { t } = require('koishi-utils')
const extendMysql = require('./mysql')

const Templates = {
  'description': 'ink功能',
  'example': '查看当前剧情 / 选项',
  'example-choice': '选择第一个选项',
  'skip': '跳至下一个选项',
  'hard-reset': '重置（请谨慎使用）',
  'hard-unlock': '强制解除进程锁（需要 2 级权限，请谨慎使用）',
  'is-locking': ' 正处于剧情中，请等待其剧情结束。',
  'is-locking-self': '当前处于剧情中，请等待剧情结束。',
  'hard-reset-confirm': '这将重置你的所有进度与数据，且不可挽回。请于5秒内回复 是 或 y(es) 以确认。',
  'hard-reset-completed': '已重置。',
  'hard-reset-failed': '已取消重置。',
  'hard-unlock-unavail': '未处于剧情中，不需要解除进程锁。',
  'hard-unlock-completed': '已强制解除进程锁。',
  'choices': '选项：',
  'skip-to-choices': '已跳转至选项：',
  'the-end': '=== 故事结束 ===',
  'error': '出现了一点错误，请尝试重新开始剧情。'
}

let StoryLock = []

module.exports = (ctx, config) => {
  let command = config.command
  extendMysql(config.subcommand)

  t.set(command, Templates)

  const storyJson = require(config.filePath)

  ctx.command(command + ' <choice>', t(`${command}.description`))
    .example(config.subcommand + '  ' + t(`${command}.example`))
    .example(config.subcommand + ' 1  ' + t(`${command}.example-choice`))
    .option('hard-reset', '-R ' + t(`${command}.hard-reset`))
    .option('hard-unlock', '-U ' + t(`${command}.hard-unlock`), { authority: 2 })
    .option('skip', '-s ' + t(`${command}.skip`))
    .userFields(['id'])
    .action(async ({ session, options }, choice) => {
      try {
        let db = session.database
        let bot = session.bot

        let ch = StoryLock.find(o => o.channel == session.channelId)
        if (options['hard-unlock']) {
          if (!ch || !ch.lock) {
            return t(`${command}.hard-unlock-unavail`)
          } else {
            ch.lock = false
            return t(`${command}.hard-unlock-completed`)
          }
        }
        if (!ch) {
          StoryLock.push({
            channel: session.channelId,
            lock: true,
            id: session.userId,
            uid: session.user.id
          })
          ch = StoryLock[StoryLock.length - 1]
        } else if (ch.lock && ch.uid != session.user.id) {
          let currentUser = await bot.getGroupMember(session.channelId, ch.id)
          let name = currentUser.nickname || currentUser.username
          return name + t(`${command}.is-locking`)
        } else if (ch.lock && ch.uid == session.user.id) {
          return t(`${command}.is-locking-self`)
        } else {
          ch.lock = true
          ch.id = session.userId
          ch.uid = session.user.id
        }

        let story = new Story(storyJson)

        if (options['hard-reset']) {
          let replyMessage
          session.send(t(`${command}.hard-reset-confirm`))
          let ans = await session.prompt(5 * 1000)
          if (['是', 'y', 'yes'].indexOf(ans) != -1) {
            story.ResetState()
            db.saveGameData(config.subcommand, session.user.id, story.state.toJson())
            replyMessage = t(`${command}.hard-reset-completed`)
          } else {
            replyMessage = t(`${command}.hard-reset-failed`)
          }
          ch.lock = false
          return replyMessage
        }

        let save = await db.loadGameData(config.subcommand, session.user.id)
        if (!save) story.ResetState()
        else story.state.LoadJson(save)

        if (story.currentChoices.length > 0 && choice) {
          let userChoice = parseInt(options.choose)
          if (isNaN(userChoice)) userChoice = 0
          else userChoice -= 1
          story.ChooseChoiceIndex(userChoice)
        }

        let speed = config.messageSpeed ?? session.app.options.delay.message

        while (story.canContinue) {
          if (options.skip) story.Continue()
          else {
            session.send(story.Continue())
            let skip = await session.prompt(speed)
            if (['-s', '--skip', 'skip', '跳过'].indexOf(skip) != -1) {
              options.skip = true
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

        ch.lock = false
        db.saveGameData(config.subcommand, session.user.id, story.state.toJson())
      } catch (err) {
        console.log(err)
        return t(`${command}.error`)
      }
    })
}