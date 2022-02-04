const { app, ipcMain, dialog } = require('electron')
const fs = require('fs-extra')
const path = require('path')
const moment = require('moment')
const getData = require('./getData').getData

const start = async () => {
  const { dataMap, current } = await getData()
  const data = dataMap.get(current)
  if (!data.result.length) return
  const filePath = dialog.showSaveDialogSync({
    defaultPath: path.join(
      app.getPath('downloads'),
      `arknights_gacha_${data.uid}_${moment().format('YYYYMMDD_HHmmss')}`
    ),
    filters: [{ name: 'JSON文件', extensions: ['json'] }]
  })
  if (filePath) {
    await fs.ensureFile(filePath)
    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
  }
}

ipcMain.handle('EXPORT_UIGF_JSON', async () => {
  await start()
})
