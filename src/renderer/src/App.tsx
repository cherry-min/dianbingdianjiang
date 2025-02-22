import React from 'react'
import Question from './components/Question'

const App: React.FC = () => {
  return (
    <div>
      {/* <button onClick={handleQuery}>Query Items</button>
      <button onClick={handleInsert}>Insert Item</button>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileChange} ref={fileInputRef} />
      <div id="result">{result}</div>
      {items.length > 0 && (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.name} - {item.description}
            </li>
          ))}
        </ul>
      )} */}
      <Question />
    </div>
  )
}

export default App
