const _ = require('lodash-es')
const moment = require('moment')
const ExcelJS = require('./module/exceljs.min.js')
const getData = require('./getData').getData
const { app, ipcMain, dialog } = require('electron')
const fs = require('fs-extra')
const path = require('path')
const i18n = require('./i18n')
const config = require('./config')

const start = async () => {
  const { header, customFont, filePrefix, fileType } = i18n.excel
  const { dataMap, current } = await getData()
  const data = dataMap.get(current)
  // https://github.com/sunfkny/genshin-gacha-export-js/blob/main/index.js
  const workbook = new ExcelJS.Workbook()

  const poolEntries = _.sortBy(Object.entries(_.groupBy(data.result, 'pool')), ([, list]) => -_.maxBy(list, 'ts').ts)
  for (const [pool, list] of poolEntries) {
    const sheet = workbook.addWorksheet(pool, { views: [{ state: 'frozen', ySplit: 1 }] })
    const width = config.value().lang.includes('zh-') ? [24, 14, 8, 8, 8, 8, 8] : [24, 32, 12, 12, 12, 8, 8]
    const excelKeys = ['time', 'name', 'rarity', 'total', 'pity', 'new', 'remark']
    sheet.columns = excelKeys.map((key, index) => {
      return {
        header: header[key],
        key,
        width: width[index]
      }
    })
    // get gacha logs
    const logs = list.flatMap(({ ts, chars }) => chars.map((item) => ({ ...item, ts: ts * 1000 })))
    let total = 0
    let pity = 0
    const rows = []
    for (const { ts, name, rarity, isNew } of logs) {
      total += 1
      pity += 1
      rows.push([moment(new Date(ts)).format('YYYY-MM-DD HH:mm:ss'), name, rarity + 1, total, pity, isNew ? '✔️' : ''])
      if (rarity === 5) pity = 0
    }

    sheet.addRows(rows)
    // set xlsx hearer style
    ;['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((v) => {
      sheet.getCell(`${v}1`).border = {
        top: { style: 'thin', color: { argb: 'ffc4c2bf' } },
        left: { style: 'thin', color: { argb: 'ffc4c2bf' } },
        bottom: { style: 'thin', color: { argb: 'ffc4c2bf' } },
        right: { style: 'thin', color: { argb: 'ffc4c2bf' } }
      }
      sheet.getCell(`${v}1`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'ffdbd7d3' }
      }
      sheet.getCell(`${v}1`).font = {
        name: customFont,
        color: { argb: 'ff757575' },
        bold: true
      }
    })
    sheet.getCell('F1').alignment = { horizontal: 'center' }
    // set xlsx cell style
    rows.forEach((v, i) => {
      ;['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((c) => {
        sheet.getCell(`${c}${i + 2}`).border = {
          top: { style: 'thin', color: { argb: 'ffc4c2bf' } },
          left: { style: 'thin', color: { argb: 'ffc4c2bf' } },
          bottom: { style: 'thin', color: { argb: 'ffc4c2bf' } },
          right: { style: 'thin', color: { argb: 'ffc4c2bf' } }
        }
        sheet.getCell(`${c}${i + 2}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'fffafafa' }
        }
        // rare rank background color
        const rankColor = {
          3: 'ff8e8e8e',
          4: 'ffce93d8',
          5: 'ffff9800',
          6: 'fff44336'
        }
        sheet.getCell(`${c}${i + 2}`).font = {
          name: customFont,
          color: { argb: rankColor[v[2]] },
          bold: v[2] >= 5
        }
      })
      sheet.getCell(`F${i + 2}`).alignment = { horizontal: 'center' }
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const filePath = dialog.showSaveDialogSync({
    defaultPath: path.join(app.getPath('downloads'), `${filePrefix}_${data.uid}_${moment().format('YYYYMMDD_HHmmss')}`),
    filters: [{ name: fileType, extensions: ['xlsx'] }]
  })
  if (filePath) {
    await fs.ensureFile(filePath)
    await fs.writeFile(filePath, buffer)
  }
}

ipcMain.handle('SAVE_EXCEL', async () => {
  await start()
})
