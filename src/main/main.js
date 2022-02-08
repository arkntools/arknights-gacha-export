const { app, BrowserWindow, ipcMain } = require('electron')
const { initWindow } = require('./utils')
require('./getData')
require('./excel')
require('./UIGFJson')
const { getUpdateInfo } = require('./update')
const { fetchAllData } = require('./getData')

const isDev = !app.isPackaged
const isSilent = app.commandLine.hasSwitch('silent')
let win = null

function createWindow() {
  win = initWindow()
  win.setMenuBarVisibility(false)
  isDev ? win.loadURL(`http://localhost:${process.env.PORT}`) : win.loadFile('dist/electron/renderer/index.html')
  if (isDev) {
    win.webContents.openDevTools({ mode: 'undocked', activate: true })
  }
}

const isFirstInstance = app.requestSingleInstanceLock()

if (!isFirstInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(async () => {
    if (isSilent) {
      await fetchAllData()
      app.exit(0)
      return
    }
    createWindow()
  })

  ipcMain.handle('RELAUNCH', async () => {
    app.relaunch()
    app.exit(0)
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  app.on('will-quit', (e) => {
    if (getUpdateInfo().status === 'moving') {
      e.preventDefault()
      setTimeout(() => {
        app.quit()
      }, 3000)
    }
  })
}
