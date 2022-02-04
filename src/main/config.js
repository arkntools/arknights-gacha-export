const { readJSON, saveJSON, decipherAes, cipherAes, detectLocale } = require('./utils')

const config = {
  tokens: [],
  logType: 1,
  lang: detectLocale(),
  current: '',
  autoUpdate: true
}

const getLocalConfig = async () => {
  const localConfig = await readJSON('config.json')
  if (!localConfig) return
  const configTemp = {}
  for (const key in localConfig) {
    if (typeof config[key] !== 'undefined') {
      configTemp[key] = localConfig[key]
    }
  }
  configTemp.tokens.forEach((item) => {
    try {
      item[1] = decipherAes(item[1])
    } catch (e) {
      item[1] = ''
    }
  })
  Object.assign(config, configTemp)
}

getLocalConfig()

let tokensMap = null
const setConfig = (key, value) => {
  Reflect.set(config, key, value)
}

const saveConfig = async () => {
  let configTemp = config
  if (tokensMap) {
    const tokens = [...tokensMap]
    tokens.forEach((item) => {
      try {
        item[1] = cipherAes(item[1])
      } catch (e) {
        item[1] = ''
      }
    })
    configTemp = Object.assign({}, config, { tokens })
  }
  await saveJSON('config.json', configTemp)
}

const getPlainConfig = () => config

const configProxy = new Proxy(config, {
  get: function (obj, prop) {
    if (prop === 'tokens') {
      if (!tokensMap) {
        tokensMap = new Map(obj[prop])
      }
      return tokensMap
    } else if (prop === 'set') {
      return setConfig
    } else if (prop === 'save') {
      return saveConfig
    } else if (prop === 'value') {
      return getPlainConfig
    }
    return obj[prop]
  }
})

module.exports = configProxy
