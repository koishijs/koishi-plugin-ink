const { extendDatabase } = require('koishi-core')

extendDatabase('koishi-plugin-mysql', ({ Domain, tables }) => {
  tables.gamedata = Object.assign([
    'PRIMARY KEY(`uid`) USING BTREE',
    'FOREIGN KEY(`uid`) REFERENCES user(`id`)'
  ], {
    uid: 'BIGINT(20) UNSIGNED NOT NULL',
    save: new Domain.Json()
  })
})

extendDatabase('koishi-plugin-mysql', {
  async loadGameData(uid) {
    let res = await this.query('SELECT save FROM gamedata WHERE uid = ' + uid)
    if (!res.length) return
    else return JSON.stringify(res[0].save)
  },
  async saveGameData(uid, save) {
    return this.query(`INSERT INTO gamedata VALUES (${uid}, ${JSON.stringify(save)}) `
      + `ON DUPLICATE KEY UPDATE save = ${JSON.stringify(save)}`)
  }
})