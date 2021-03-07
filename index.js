const { inkInstance, PluginOptions } = require('./ink')

class Plugins {
  constructor(options) {
    this.list = []

    let rootOptions = new PluginOptions(options)
    if (rootOptions) this.list.push(rootOptions)

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
    ctx.plugin(inkInstance, pOptions)
  })
}