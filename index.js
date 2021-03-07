const inkInstance = require('./ink')

class PluginOptions {
  constructor(pOptions) {
    this.command = 'ink'
    this.filePath = './examples/intercept.ink.json'
    this.subcommand = this.command

    if (pOptions) {
      if (pOptions.command) this.command = pOptions.command
      if (pOptions.filePath) this.filePath = './../../' + pOptions.filePath
      if (pOptions.messageSpeed) this.messageSpeed = pOptions.messageSpeed

      let subcommand = this.command.match(/\/([^/]+?)$/)
      if (subcommand) this.subcommand = subcommand[1]
      else this.subcommand = this.command
    }
  }
}

class Plugins {
  constructor(options) {
    this.list = []

    if (options && (options.command
      || options.filePath
      || options.messageSpeed)) {
      this.list.push(new PluginOptions(options))
    }

    if (options && Array.isArray(options.files)) {
      options.files.forEach(file => {
        let subOptions = new PluginOptions(file)
        this.list.push(subOptions)
      })
    }

    if (!this.list.length) {
      this.list.push(new PluginOptions())
    }
  }
}

module.exports.name = 'ink'

module.exports.apply = (ctx, pluginOptions) => {
  const plugins = new Plugins(pluginOptions)

  plugins.list.forEach(pOptions => {
    inkInstance(ctx, pOptions)
  })
}