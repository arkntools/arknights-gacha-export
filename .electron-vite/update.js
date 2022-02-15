const fs = require('fs-extra')
const path = require('path')
const crypto = require('crypto')
const AdmZip = require('adm-zip')
const { version } = require('../package.json')

const hash = (data, type = 'sha256') => {
  const hmac = crypto.createHmac(type, 'hk4e')
  hmac.update(data)
  return hmac.digest('hex')
}

const createZip = (filePath, dest) => {
  const zip = new AdmZip()
  zip.addLocalFolder(filePath)
  zip.toBuffer()
  zip.writeZip(dest)
}

const start = async () => {
  const appPath = './build/win-unpacked/resources/app'
  const outputPath = path.resolve('./build/update/update/')
  const zipPath = path.resolve(outputPath, 'app.zip')
  await fs.ensureDir(outputPath)
  await fs.emptyDir(outputPath)
  await fs.outputFile('./build/update/CNAME', 'arknights-gacha-export.lolicon.app')
  createZip(appPath, zipPath)
  const buffer = await fs.readFile(zipPath)
  const sha256 = hash(buffer)
  const hashedZipName = `${sha256.slice(0, 8)}.zip`
  await fs.copy(zipPath, path.resolve(outputPath, hashedZipName))
  await fs.remove(zipPath)
  await fs.outputJSON(path.join(outputPath, 'manifest.json'), {
    active: true,
    version,
    from: '0.0.1',
    name: hashedZipName,
    hash: sha256
  })
  copyHTML()
}

const copyHTML = () => {
  try {
    const output = path.resolve('./build/update/')
    const dir = path.resolve('./src/web/')
    fs.copySync(dir, output)
  } catch (e) {
    console.error(e)
  }
}

start()
