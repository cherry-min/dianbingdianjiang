import React, { useState, useEffect, useRef } from 'react'
import './index.css'
import * as XLSX from 'xlsx'
import { message } from 'antd'
interface Question {
  id: number
  question: string
  answer: string
}

interface Student {
  id: number
  name: string
  mbti?: number
}

// 学生数据

const Question: React.FC = () => {
  // 主题状态
  const [isDarkTheme, setIsDarkTheme] = useState(false)
  // 选项卡状态
  const [activeTab, setActiveTab] = useState<'qa' | 'chooser'>('qa')
  // 问答系统状态
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  // 选人系统状态
  const [numPeople, setNumPeople] = useState(1)
  const [isChoosing, setIsChoosing] = useState(false)
  const [selectedNames, setSelectedNames] = useState<string[]>([])
  const intervalRef = useRef<number>()
  // 状态管理
  const [questions, setQuestions] = useState<Question[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [refreshed, setRefreshed] = useState(new Date().getTime())
  // 初始化加载数据
  useEffect(() => {
    loadQuestions()
    loadStudents()
  }, [refreshed])
  //从数据库加载题目
  const loadQuestions = async () => {
    try {
      const results = await window.api.dbQuery('SELECT * FROM questions')
      setQuestions(results)
    } catch (error) {
      console.error('加载题目失败:', error)
    }
  }

  // 从数据库加载学生
  const loadStudents = async () => {
    try {
      const results = await window.api.dbQuery('SELECT * FROM students')
      setStudents(results)
    } catch (error) {
      console.error('加载学生失败:', error)
    }
  }
  const cleanData = (table: 'questions' | 'students') => {
    if (window.confirm(`确认清除${table}数据？`)) {
      window.api.dbTransaction(`DELETE FROM ${table} WHERE 1=1`)
      message.success(`${table} 数据清除成功！`)
    }
    setRefreshed(new Date().getTime())
    setSelectedNames([])
  }
  // 通用导入处理
  const handleImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
    table: 'questions' | 'students'
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        // 验证表头
        const [header, ...rows] = jsonData
        if (!validateHeader(table, header)) {
          message.error('文件列头不匹配')
          return
        }
        // 批量插入数据
        await batchInsertData(table, rows, header)
        // 刷新数据
        table === 'questions' ? loadQuestions() : loadStudents()
        message.success(`${table} 数据导入成功！`)
      } catch (error) {
        message.error('导入失败')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // 验证Excel表头
  const validateHeader = (table: string, header: any) => {
    // 定义各表字段要求
    const schema = {
      questions: {
        required: ['问题', '答案'],
        optional: ['']
      },
      students: {
        required: ['姓名'],
        optional: ['性格']
      }
    }

    // 转换输入为小写数组
    const inputHeaders = (header || []).map((h: string) => h.toLowerCase().trim())

    // 获取当前表的校验规则
    const { required, optional } = schema[table]
    const allAllowed = [...required, ...optional].map((h) => h.toLowerCase())

    // 校验逻辑
    return (
      // 1. 包含所有必填字段
      required.every((h: string) => inputHeaders.includes(h.toLowerCase())) &&
      // 2. 没有非法字段
      inputHeaders.every((h: string) => allAllowed.includes(h)) &&
      // 3. 至少包含必填字段（防止空数组通过）
      inputHeaders.length >= required.length
    )
  }
  // 批量插入数据
  const batchInsertData = async (table: string, rows: any[], header: any) => {
    debugger
    const insertStatements = {
      questions: 'INSERT INTO questions (question, answer) VALUES (?, ?)',
      students: `INSERT INTO students (name ${header.indexOf('性格') > 0 ? ', mbti' : ''}) VALUES (?${header.indexOf('性格') > 0 ? ', ?' : ''})`
    }

    // 转换参数格式
    const paramsList = rows
      .filter((row) => row[0] != null)
      .map((row) => (table === 'questions' ? [row[0], row[1]] : [row[0], row[1] || null]))
    //将paramsList row[0], row[1]同时为空的过滤掉

    // 使用事务批量插入
    await window.api.dbTransaction(insertStatements[table], paramsList)

    setRefreshed(new Date().getTime())
  }

  // // 导出JSON数据
  // const exportData = (dataType: 'questions' | 'students') => {
  //   const data = dataType === 'questions' ? questions : students
  //   const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  //   const url = URL.createObjectURL(blob)
  //   const a = document.createElement('a')
  //   a.href = url
  //   a.download = `${dataType}_${new Date().toISOString()}.json`
  //   a.click()
  // }

  // 主题切换
  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme)
    document.body.classList.toggle('dark-theme')
  }

  // 问答系统逻辑
  const handleNextQuestion = () => {
    setCurrentQuestion((prev) => (prev + 1) % questions.length)
    setShowAnswer(false)
  }

  // 选人系统逻辑
  const startChoosing = () => {
    if (isChoosing) return
    setIsChoosing(true)
    setSelectedNames([])
    if (students.length > 0) {
      intervalRef.current = window.setInterval(() => {
        const randomNames = Array.from(
          { length: numPeople },
          () => students[Math.floor(Math.random() * students.length)]
        )
        setSelectedNames(randomNames.map((r) => r.name))
      }, 100)
    } else {
      message.error('请先导入学生数据')
    }
  }

  const stopChoosing = () => {
    if (!isChoosing) return
    setIsChoosing(false)
    clearInterval(intervalRef.current)
  }

  const buttonContainerStyle: React.CSSProperties = {
    marginTop: 20,
    display: 'flex',
    gap: '12px', // 添加按钮间距
    alignItems: 'center'
  }

  // 清理定时器
  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  return (
    <>
      <button className="button " onClick={() => window.location.reload()}>
        🔄 刷新页面
      </button>
      <button className="button theme-toggle" onClick={toggleTheme}>
        🌓 切换主题
      </button>
      <div className="container">
        <div className="tab-container">
          <button
            className={`tab-button ${activeTab === 'qa' && 'active'}`}
            onClick={() => setActiveTab('qa')}
          >
            📚 课堂问答
          </button>
          <button
            className={`tab-button ${activeTab === 'chooser' && 'active'}`}
            onClick={() => setActiveTab('chooser')}
          >
            🎮 随机选人
          </button>
        </div>
        {/* 问答系统 */}
        <div id="qa" className={`tab-content ${activeTab === 'qa' && 'active'}`}>
          <div className="card">
            {questions.length > 0 ? (
              <>
                <div id="question">{questions[currentQuestion].question}</div>
                {showAnswer && <div id="answer">{questions[currentQuestion].answer}</div>}
              </>
            ) : (
              <div className="loading-placeholder">请先导入题目数据</div>
            )}
            {/* 修改后的按钮容器 */}
            <div style={buttonContainerStyle}>
              <button
                className="button"
                onClick={() => setShowAnswer(true)}
                disabled={showAnswer || questions.length === 0}
              >
                显示答案
              </button>
              <button
                className="button"
                onClick={handleNextQuestion}
                disabled={questions.length === 0}
              >
                下一题
              </button>
            </div>
          </div>
          <div className="import-section" style={buttonContainerStyle}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleImport(e, 'questions')}
              id="importQuestions"
              hidden
            />
            <label htmlFor="importQuestions" className="button">
              导入数据
            </label>
            <div className="button" onClick={() => cleanData('questions')}>
              清除数据
            </div>
          </div>
        </div>
        {/* 随机选人系统 */}
        <div id="chooser" className={`tab-content ${activeTab === 'chooser' && 'active'}`}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>随机选人系统</h3>

            <div className="chooser-controls">
              <input
                type="number"
                min="1"
                value={numPeople}
                onChange={(e) => setNumPeople(Math.min(Number(e.target.value), students.length))}
                placeholder="选择人数"
              />
              <button className="button" onClick={startChoosing}>
                开始选人
              </button>
              <button
                className="button"
                onClick={stopChoosing}
                style={{ backgroundColor: '#27ae60' }}
              >
                停止选人
              </button>
            </div>

            <div id="nameContainer">
              {selectedNames.map((name, index) => (
                <div key={index} className="name-box">
                  {name}
                </div>
              ))}
            </div>
            {!isChoosing && selectedNames.length > 0 && (
              <div id="result">
                <p>
                  选中人员：<span className="highlight">{selectedNames.join('、')}</span>
                </p>
              </div>
            )}
            <div className="import-section" style={buttonContainerStyle}>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleImport(e, 'students')}
                id="importStudents"
                hidden
              />
              <label htmlFor="importStudents" className="button">
                导入学生数据
              </label>
              <div className="button" onClick={() => cleanData('students')}>
                清除数据
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Question
