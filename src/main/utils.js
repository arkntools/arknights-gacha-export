const fs = require('fs-extra')
const path = require('path')
const { EOL } = require('os')
const fetch = require('electron-fetch').default
const { BrowserWindow, app, shell, dialog } = require('electron')
const crypto = require('crypto')
const unhandled = require('electron-unhandled')
const windowStateKeeper = require('electron-window-state')
const debounce = require('lodash/debounce')
const moment = require('moment')

const isDev = !app.isPackaged
const appId = 'app.lolicon.arknights-gacha-export'

const appRoot = isDev ? path.resolve(__dirname, '..', '..') : path.resolve(app.getAppPath(), '..', '..')
const userDataPath = path.resolve(app.getPath('appData'), appId)
const logsPath = path.join(userDataPath, 'logs')
const tempPath = path.resolve(app.getPath('temp'), appId)

// 数据目录迁移
const oldUserDataPath = path.resolve(appRoot, 'userData')
if (fs.existsSync(oldUserDataPath)) {
  fs.moveSync(oldUserDataPath, userDataPath, { overwrite: true })
}

let win = null
const initWindow = () => {
  const mainWindowState = windowStateKeeper({
    defaultWidth: 888,
    defaultHeight: 565
  })
  win = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  })
  const saveState = debounce(mainWindowState.saveState, 500)
  win.on('resize', () => saveState(win))
  win.on('move', () => saveState(win))
  return win
}

const getWin = () => win

const logs = []
const pushLog = (type, ...msgs) => {
  logs.push([Date.now(), type, msgs])
}
const saveLog = () => {
  if (!logs.length) return
  const text = logs
    .map(([time, type, msgs]) => `[${type}][${new Date(time).toLocaleString()}]${msgs.join(' ')}`)
    .join(EOL)
  fs.outputFileSync(path.join(logsPath, `${moment().format('YYYYMMDD')}.log`), text + EOL, { flag: 'a' })
  logs.splice(0)
}
const openLogsDir = async () => {
  const err = await shell.openPath(logsPath)
  if (err) dialog.showErrorBox('Error', err)
}

const sendMsg = (text, type = 'LOAD_DATA_STATUS', needLog = true) => {
  win?.webContents.send(type, text)
  if (needLog && type !== 'LOAD_DATA_STATUS') {
    pushLog(type, text)
    saveLog()
  }
}

unhandled({
  showDialog: false,
  logger: (err) => {
    pushLog('ERROR', err.stack || err.message || err)
    saveLog()
  }
})

/**
 * @param {string} url
 * @param {import('electron-fetch').RequestInit} options
 */
const request = async (url, options = {}) => {
  const res = await fetch(url, {
    timeout: 15 * 1000,
    ...options
  })
  return await res.json()
}

const sleep = (sec = 1) => {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000)
  })
}

const langMap = new Map([
  ['zh-cn', '简体中文']
  // ['zh-tw', '繁體中文'],
  // ['de-de', 'Deutsch'],
  // ['en-us', 'English'],
  // ['es-es', 'Español'],
  // ['fr-fr', 'Français'],
  // ['id-id', 'Indonesia'],
  // ['ja-jp', '日本語'],
  // ['ko-kr', '한국어'],
  // ['pt-pt', 'Português'],
  // ['ru-ru', 'Pусский'],
  // ['th-th', 'ภาษาไทย'],
  // ['vi-vn', 'Tiếng Việt']
])

const localeMap = new Map([
  ['zh-cn', ['zh', 'zh-CN']],
  ['zh-tw', ['zh-TW']],
  ['de-de', ['de-AT', 'de-CH', 'de-DE', 'de']],
  ['en-us', ['en-AU', 'en-CA', 'en-GB', 'en-NZ', 'en-US', 'en-ZA', 'en']],
  ['es-es', ['es', 'es-419']],
  ['fr-fr', ['fr-CA', 'fr-CH', 'fr-FR', 'fr']],
  ['id-id', ['id']],
  ['ja-jp', ['ja']],
  ['ko-kr', ['ko']],
  ['pt-pt', ['pt-BR', 'pt-PT', 'pt']],
  ['ru-ru', ['ru']],
  ['th-th', ['th']],
  ['vi-vn', ['vi']]
])

const detectLocale = () => {
  const locale = app.getLocale()
  let result = 'zh-cn'
  for (const [key, list] of localeMap) {
    if (list.includes(locale)) {
      result = key
      break
    }
  }
  return result
}

const saveJSON = async (name, data) => {
  try {
    await fs.outputJSON(path.join(userDataPath, name), data)
  } catch (e) {
    sendMsg(e, 'ERROR')
    await sleep(3)
  }
}

const readJSON = async (name) => {
  let data = null
  try {
    data = await fs.readJSON(path.join(userDataPath, name))
  } catch (e) {}
  return data
}

const hash = (data, type = 'sha256') => {
  const hmac = crypto.createHmac(type, 'hk4e')
  hmac.update(data)
  return hmac.digest('hex')
}

const scryptKey = crypto.scryptSync(app.getPath('userData'), 'hk4e', 24)
const cipherAes = (data) => {
  const algorithm = 'aes-192-cbc'
  const iv = Buffer.alloc(16, 0)
  const cipher = crypto.createCipheriv(algorithm, scryptKey, iv)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

const decipherAes = (encrypted) => {
  const algorithm = 'aes-192-cbc'
  const iv = Buffer.alloc(16, 0)
  const decipher = crypto.createDecipheriv(algorithm, scryptKey, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

const interfaces = require('os').networkInterfaces()
const localIp = () => {
  for (const devName in interfaces) {
    const iface = interfaces[devName]

    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i]
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) return alias.address
    }
  }
  return '127.0.0.1'
}

module.exports = {
  sleep,
  request,
  hash,
  cipherAes,
  decipherAes,
  pushLog,
  saveLog,
  sendMsg,
  readJSON,
  saveJSON,
  initWindow,
  getWin,
  localIp,
  detectLocale,
  langMap,
  appRoot,
  userDataPath,
  tempPath,
  openLogsDir
}
