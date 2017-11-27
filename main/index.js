// Native
const { format } = require('url')

// Packages
const { BrowserWindow, app, ipcMain } = require('electron')
const isDev = require('electron-is-dev')
const prepareNext = require('electron-next')
const { resolve } = require('app-root-path')
const PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-find'))
const { v4: uuid } = require('uuid')
const path = require('path')

// Prepare the renderer once the app is ready
app.on('ready', async () => {
  await prepareNext('./renderer')

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600
  })

  const devPath = 'http://localhost:8000/start'

  const prodPath = format({
    pathname: resolve('renderer/out/start/index.html'),
    protocol: 'file:',
    slashes: true
  })

  const url = isDev ? devPath : prodPath
  mainWindow.loadURL(url)
})

// Quit the app once all windows are closed
app.on('window-all-closed', app.quit)

const db = new PouchDB(path.join(app.getAppPath(), 'db'))

ipcMain.on('updateorsave:data', async (e, arg1) => {
  const result = (await db.find({
    selector: { LRN: arg1, exited: null, updated: false }
  })).docs
  if (result.length) {
    const [first] = result
    const onlyOne = (await db.find({
      selector: { _id: first._id, exited: null, updated: false }
    })).docs
    const { LRN } = onlyOne[0]
    await db.put({
      _id: onlyOne[0]._id,
      _rev: onlyOne[0]._rev,
      entered: onlyOne[0].entered,
      LRN: onlyOne[0].LRN,
      exited: Date.now(),
      updated: true
    })
  } else {
    await db.put({
      _id: uuid(),
      LRN: arg1,
      entered: Date.now(),
      exited: null,
      updated: false
    })
  }

  /* ENTERED CODE */

  db.sync('db', 'http://localhost:5984/mydb')
})

ipcMain.on('delete:data', async (e, arg1) => {
  db.destroy()
  db.sync('db', 'http://localhost:5984/mydb')
})

ipcMain.on('get:data', async (e, arg1) => {})
