'use strict'
import { app, BrowserWindow, screen, Menu, ipcMain } from 'electron'
import { google } from 'googleapis'
import fs from 'fs'

// require('electron-debug')({
//   enabled: true
// })

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CLIENT_REDIRECT_URL
)

const drive = google.drive({
  version: 'v3',
  auth: oauth2Client
})

const docs = google.docs({
  version: 'v1',
  auth: oauth2Client
})

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
let folderId = null

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

  ipcMain.on('uploadFile', async (event, type) => {
    const createRes = await drive.files.create({
      ocrLanguage: 'ja',
      resource: {
        name: `${type}.png`,
        mimeType: 'application/vnd.google-apps.document',
        parents: [folderId]
      },
      media: {
        mimeType: 'application/vnd.google-apps.document',
        body: fs.createReadStream(`${app.getAppPath()}/${type}.png`)
      }
    })
    const documentId = createRes.data.id
    const readRes = await docs.documents.get({
      documentId
    })

    let text = ''
    if (readRes.data.body && readRes.data.body.content) {
      readRes.data.body.content.forEach(content => {
        if (content.paragraph && content.paragraph.elements) {
          content.paragraph.elements.forEach(element => {
            if (element.textRun && element.textRun.content) {
              text += element.textRun.content
            }
          })
        }
      })
    }
    mainWindow.webContents.send('googleText', {
      type,
      text
    })
  })

  const authGoogleUrl = oauth2Client.generateAuthUrl({
    scope: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents'
    ],
    access_type: 'offline'
  })
  const authWindow = new BrowserWindow({
    width: size.width / 2,
    height: size.height / 2
  })
  authWindow.webContents.on('will-navigate', async (event, url) => {
    if (/\?code=\S*&scope/.test(url)) {
      const matched = url.match(/\?code=\S*&scope/)
      const code = matched[0].replace('?code=', '').replace('&scope', '')
      const { tokens } = await oauth2Client.getToken(code)
      oauth2Client.setCredentials(tokens)
      mainWindow.webContents.send('googleToken', tokens)
      const toDay = new Date()
      const res = await drive.files.create({
        resource: {
          name: `symmentry_${toDay.getFullYear()}_${toDay.getMonth() + 1}_${toDay.getDate()}`,
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      })
      folderId = res.data.id
      mainWindow.webContents.send('folderId', folderId)
      authWindow.close()
    }
  })
  authWindow.loadURL(authGoogleUrl)
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

async function onExit () {
  if (folderId) {
    await drive.files.delete({
      fileId: folderId
    })
  }
  app.quit()
}
