const inkInstance = require('./ink')
const path = require('path')

class Config {
  constructor(config) {
    this.command = 'ink'
    this.filePath = './examples/intercept.ink.json'
    this.subcommand = this.command

    if (config) {
      if (config.command) this.command = config.command
      if (config.filePath) {
        if (path.basename(path.resolve('..')) == 'node_modules') {
          this.filePath = path.resolve('../..', config.filePath)
        } else {
          this.filePath = path.resolve(config.filePath)
        }
      }
      if (config.messageSpeed) this.messageSpeed = config.messageSpeed

      let subcommand = this.command.match(/\/([^/]+?)$/)
      if (subcommand) this.subcommand = subcommand[1]
      else this.subcommand = this.command
    }
  }
}

class Plugins {
  constructor(config) {
    this.list = []

    if (config && (config.command
      || config.filePath
      || config.messageSpeed)) {
      this.list.push(new Config(config))
    }

    if (config && Array.isArray(config.files)) {
      config.files.forEach(file => {
        let subOptions = new Config(file)
        this.list.push(subOptions)
      })
    }

    if (!this.list.length) {
      this.list.push(new Config())
    }
  }
}

module.exports.name = 'ink'

module.exports.apply = (ctx, config) => {
  const plugins = new Plugins(config)

  plugins.list.forEach(config => {
    inkInstance(ctx, config)
  })
}