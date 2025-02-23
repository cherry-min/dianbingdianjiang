// database.ts
import sqlite3 from 'sqlite3'
import * as path from 'path'
import { app } from 'electron'
let db: sqlite3.Database
import fs from 'fs'

export function initializeDatabase() {
  // 区分开发环境和生产环境路径
  const isDev = !app.isPackaged
  const dbDir: string = path.join(isDev ? __dirname : app.getPath('userData'), 'teaching-tools')

  // 如果目录不存在，则创建它
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  const dbPath = path.join(dbDir, 'mydatabase.db')
  // 日志文件路径
  const logFilePath = path.join(dbDir, 'app.log')

  // 重写 console.log
  const originalLog = console.log
  console.log = (...args: any[]) => {
    const message = args
      .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
      .join(' ')
    fs.appendFileSync(logFilePath, `${new Date().toISOString()} [LOG] ${message}\n`)
    originalLog.apply(console, args)
  }

  // 重写 console.error
  const originalError = console.error
  console.error = (...args: any[]) => {
    const message = args
      .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
      .join(' ')
    fs.appendFileSync(logFilePath, `${new Date().toISOString()} [ERROR] ${message}\n`)
    originalError.apply(console, args)
  }

  // 连接数据库
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ 数据库连接失败:', err.message)
      showErrorDialog('数据库连接失败', `无法创建/打开数据库文件：\n${dbPath}`)
      return
    }

    console.log('✅ 成功连接到数据库:', dbPath)

    // 启用外键约束（如果需要）
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) {
        console.error('❌ 外键约束启用失败:', pragmaErr.message)
      }
    })

    // 创建表结构
    createTables()
  })

  // 监听应用关闭事件
  app.on('before-quit', () => {
    db.close((closeErr) => {
      if (closeErr) {
        console.error('❌ 数据库关闭失败:', closeErr.message)
        return
      }
      console.log('🗃️ 数据库连接已正常关闭')
    })
  })
}

// 错误弹窗函数（示例）
function showErrorDialog(title: string, content: string) {
  const dialog = require('electron').dialog
  dialog.showErrorBox(title, content)
}

//导出db
export function getDb() {
  return db
}

function createTables() {
  // Create questions table
  db.run(
    `
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL
    );
  `,
    (err) => {
      if (err) {
        console.error('Failed to create tables:', err)
      }
    }
  )
  //create students table ,
  db.run(
    `
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mbti TEXT  NULL
    );
  `,
    (err) => {
      if (err) {
        console.error('Failed to create tables:', err)
      }
    }
  )
}

export function query(sql: string, params: any[] = []) {
  return new Promise<any[]>((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

export function run(sql: string, params: any[] = []) {
  return new Promise<sqlite3.RunResult>((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve(this) // 'this' contains run result info
      }
    })
  })
}
