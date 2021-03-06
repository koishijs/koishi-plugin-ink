const { extendDatabase } = require('koishi-core')

module.exports = subcommand => {
  extendDatabase('koishi-plugin-mysql', ({ Domain, tables }) => {
    tables[subcommand + '_save'] = Object.assign([
      'PRIMARY KEY(`uid`) USING BTREE',
      'FOREIGN KEY(`uid`) REFERENCES user(`id`)'
    ], {
      uid: 'BIGINT(20) UNSIGNED NOT NULL',
      save: new Domain.Json()
    })
  })

  extendDatabase('koishi-plugin-mysql', {
    async loadGameData(uid) {
      let res = await this.query(`SELECT save FROM \`${subcommand}_save\` WHERE uid = ${uid}`)
      if (!res.length) return
      else return JSON.stringify(res[0].save)
    },
    async saveGameData(uid, save) {
      return this.query(`INSERT INTO \`${subcommand}_save\` VALUES (${uid}, ${JSON.stringify(save)}) `
        + `ON DUPLICATE KEY UPDATE save = ${JSON.stringify(save)}`)
    }
  })
}
