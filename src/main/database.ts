// database.ts
import sqlite3 from 'sqlite3'
import * as path from 'path'

let db: sqlite3.Database

export function initializeDatabase() {
  const dbPath = path.join(__dirname, 'mydatabase.db')
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Failed to connect to database:', err)
    } else {
      console.log('Connected to database.')
      createTables()
    }
  })
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

export function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Failed to close database:', err)
      } else {
        console.log('Database connection closed.')
      }
    })
  }
}
