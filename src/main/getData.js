const _ = require('lodash-es')
const fs = require('fs-extra')
const util = require('util')
const { ipcMain } = require('electron')
const { sleep, request, sendMsg, readJSON, saveJSON, userDataPath, langMap } = require('./utils')
const config = require('./config')
const i18n = require('./i18n')

const dataMap = new Map()
const apiDomain = 'https://ak.hypergryph.com'

const saveData = async (data, token) => {
  const obj = Object.assign({}, data)
  config.tokens.set(data.uid, token)
  await config.save()
  await saveJSON(`gacha-list-${data.uid}.json`, obj)
}

let localDataReaded = false
const readdir = util.promisify(fs.readdir)
const readData = async () => {
  if (localDataReaded) return
  localDataReaded = true
  await fs.ensureDir(userDataPath)
  const files = await readdir(userDataPath)
  for (const name of files) {
    if (/^gacha-list-\d+\.json$/.test(name)) {
      try {
        const data = await readJSON(name)
        if (data.uid) dataMap.set(data.uid, data)
      } catch (e) {
        sendMsg(e, 'ERROR')
      }
    }
  }
  if ((!config.current && dataMap.size) || (config.current && dataMap.size && !dataMap.has(config.current))) {
    await changeCurrent(dataMap.keys().next().value)
  }
}

const changeCurrent = async (uid) => {
  config.current = uid
  await config.save()
}

/**
 * @param {any[]} a
 * @param {any[]} b
 */
const mergeList = (a, b) => {
  if (!a?.length) return b || []
  if (!b?.length) return a
  const aNewest = _.last(a)
  const bOldest = _.first(b)
  // 新记录完全比旧记录新，直接拼接
  if (aNewest.ts < bOldest.ts) return a.concat(b)
  // 新纪录跟旧纪录部分重合，去除重合部分
  const pos = _.findLastIndex(b, (item) => _.isEqual(item, aNewest))
  // 找不到完全重合的，摆烂了
  if (pos === -1) return _.uniqWith(a.concat(b), _.isEqual)
  return a.concat(b.slice(pos + 1))
}

const mergeData = (local, origin) => {
  if (local?.result) {
    const localResult = local.result
    const localUid = local.uid
    const originUid = origin.uid
    if (localUid !== originUid) return origin.result
    const originResult = mergeList(localResult, origin.result)
    return originResult
  }
  return origin.result
}

const getGachaLog = async ({ page, url, retryCount }) => {
  const text = i18n.log
  try {
    const res = await request(`${url}&page=${page}`)
    checkGachaResStatus(res)
    return res.data
  } catch (e) {
    if (retryCount) {
      sendMsg(i18n.parse(text.fetch.retry, { page, count: 6 - retryCount }))
      await sleep(5)
      retryCount--
      return await getGachaLog({ page, retryCount, url })
    } else {
      sendMsg(i18n.parse(text.fetch.retryFailed, { page }))
      throw e
    }
  }
}

const getGachaLogs = async (token) => {
  const text = i18n.log
  let page = 1
  const list = []
  let res = {}
  const url = `${apiDomain}/user/api/inquiry/gacha?token=${encodeURIComponent(token)}`
  do {
    if (page % 10 === 0) {
      sendMsg(i18n.parse(text.fetch.interval, { page }))
      await sleep(1)
    }
    sendMsg(i18n.parse(text.fetch.current, { page }))
    res = await getGachaLog({ page, url, retryCount: 5 })
    if (!res) break
    list.push(...res.list)
    if (list.length >= res.pagination.total) break
    page += 1
    await sleep(0.3)
  } while (res.list.length > 0)
  return list
}

const checkGachaResStatus = (res) => {
  if (res?.code !== 0) {
    const message = res.msg
    sendMsg(message)
    throw new Error(message)
  }
  return res
}

const checkUserInfoResStatus = (res) => {
  if (res?.status !== 0) {
    const message = res.msg
    sendMsg(message)
    // token 错误或已失效
    if (res?.status === 3) sendMsg(undefined, 'TOKEN_NOT_SET', false)
    throw new Error(message)
  }
  return res
}

const tryGetUserInfo = async (token) => {
  const url = 'https://as.hypergryph.com/u8/user/info/v1/basic'
  const res = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId: 1, channelMasterId: 1, channelToken: { token } })
  })
  checkUserInfoResStatus(res)
  const { uid, nickName = '' } = res.data || {}
  if (uid) return { uid, nickName }
}

const getUrlFromConfig = () => {
  if (config.tokens.size) {
    if (config.current && config.tokens.has(config.current)) {
      const url = config.tokens.get(config.current)
      return url
    }
  }
}

const fetchData = async (token) => {
  // 读取配置
  await readData()
  if (!token) token = getUrlFromConfig()
  if (!token) {
    sendMsg(i18n.log.fetch.tokenNotSet)
    sendMsg(undefined, 'TOKEN_NOT_SET', false)
    return false
  }
  // 获取用户信息
  const { uid, nickName } = await tryGetUserInfo(token)
  // 获取寻访记录
  const result = await getGachaLogs(token)
  result.reverse()
  const data = { result, time: Date.now(), uid, nickName }
  const localData = dataMap.get(uid)
  if (!nickName) data.nickName = localData.nickName
  data.result = mergeData(localData, data)
  dataMap.set(uid, data)
  await changeCurrent(uid)
  await saveData(data, token)
  return true
}

ipcMain.handle('FETCH_DATA', async (event, param) => {
  try {
    const success = await fetchData(param)
    if (!success) return false
    return {
      dataMap,
      current: config.current
    }
  } catch (e) {
    sendMsg(e, 'ERROR')
    console.error(e)
  }
  return false
})

ipcMain.handle('READ_DATA', async () => {
  await readData()
  return {
    dataMap,
    current: config.current
  }
})

ipcMain.handle('CHANGE_UID', (event, uid) => {
  config.current = uid
})

ipcMain.handle('GET_CONFIG', () => {
  return config.value()
})

ipcMain.handle('LANG_MAP', () => {
  return langMap
})

ipcMain.handle('SAVE_CONFIG', (event, [key, value]) => {
  config[key] = value
  config.save()
})

ipcMain.handle('I18N_DATA', () => {
  return i18n.data
})

exports.getData = () => {
  return {
    dataMap,
    current: config.current
  }
}
