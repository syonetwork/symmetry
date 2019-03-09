'use strict'

import { app, BrowserWindow, screen, Menu } from 'electron'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
let menu
const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  const size = screen.getPrimaryDisplay().size // ディスプレイのサイズを取得する
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    center: true,
    focusable: true,
    width: size.width / 2,
    height: size.height / 2,
    frame: true,
    show: true,
    transparent: false,
    resizable: true,
    // アプリケーション起動した時に先頭に表示する
    'always-on-top': true
  })
  // mainWindow.setIgnoreMouseEvents(true)
  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  menu = Menu.buildFromTemplate([
    {
      label: 'symmetry',
      submenu: [
        {label: 'Exit', click: onExit}
      ]
    }
  ])

  Menu.setApplicationMenu(menu)
  mainWindow.setMenu(menu)
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('browser-window-blur', () => {
  // 常に先頭に表示する
  // mainWindow.setAlwaysOnTop(true)
})

app.on('blur', () => {
  // 常に先頭に表示する
  // mainWindow.setAlwaysOnTop(true)
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

function onExit () {
  app.quit()
}
