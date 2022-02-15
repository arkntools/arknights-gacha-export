const { app } = require('electron')
const fetch = require('electron-fetch').default
const semver = require('semver')
const util = require('util')
const path = require('path')
const fs = require('fs-extra')
const extract = require('../module/extract-zip')
const { version } = require('../../../package.json')
const { hash, sendMsg, tempPath, pushLog, saveLog } = require('../utils')
const config = require('../config')
const i18n = require('../i18n')
const streamPipeline = util.promisify(require('stream').pipeline)

async function download(url, filePath) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`unexpected response ${response.statusText}`)
  await streamPipeline(response.body, fs.createWriteStream(filePath))
}

const updateInfo = {
  status: 'init'
}

const isDev = !app.isPackaged
const appPath = isDev ? path.resolve(__dirname, '../../update-dev/app') : app.getAppPath()
const updatePath = path.resolve(tempPath, 'update')

const update = async () => {
  if (isDev) return
  try {
    const url = 'https://arknights-gacha-export.lolicon.app/update'
    const res = await fetch(`${url}/manifest.json?t=${Math.floor(Date.now() / (1000 * 60 * 10))}`)
    const data = await res.json()
    if (!data.active) return
    if (!(semver.gt(data.version, version) && semver.gte(version, data.from))) return
    pushLog('INFO', 'New version found', data.version)
    await fs.ensureDir(updatePath)
    await fs.emptyDir(updatePath)
    const filePath = path.join(updatePath, data.name)
    if (!config.autoUpdate) {
      sendMsg(data.version, 'NEW_VERSION')
      return
    }
    updateInfo.status = 'downloading'
    const newPackageURL = `${url}/${data.name}`
    pushLog('INFO', 'Downloading new version', newPackageURL)
    await download(newPackageURL, filePath)
    const buffer = await fs.readFile(filePath)
    const sha256 = hash(buffer)
    if (sha256 !== data.hash) {
      pushLog('WARN', 'Hash check failed', sha256, data.hash)
      return
    }
    const appPathTemp = path.join(updatePath, 'app')
    pushLog('INFO', 'Extracting', filePath)
    await extract(filePath, { dir: appPathTemp })
    updateInfo.status = 'moving'
    await fs.emptyDir(appPath)
    pushLog('INFO', 'Copying to', appPath)
    await fs.copy(appPathTemp, appPath)
    updateInfo.status = 'finished'
    pushLog('INFO', 'Update success')
    sendMsg(i18n.log.autoUpdate.success, 'UPDATE_HINT')
  } catch (e) {
    updateInfo.status = 'failed'
    sendMsg(e, 'ERROR')
  }
  saveLog()
}

const getUpdateInfo = () => updateInfo

setTimeout(update, 1000)

exports.getUpdateInfo = getUpdateInfo
