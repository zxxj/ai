import { useState, useEffect, useRef } from 'react'
import './App.css'

interface Todo {
  id: number
  text: string
  completed: boolean
  createdAt: number
}

type FilterType = 'all' | 'active' | 'completed'

function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('todos')
    return saved ? JSON.parse(saved) : []
  })
  const [inputValue, setInputValue] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())
  const [addingId, setAddingId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // 持久化到 localStorage
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  // 编辑时自动聚焦
  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  // 添加 Todo
  const addTodo = () => {
    const text = inputValue.trim()
    if (!text) return

    const newTodo: Todo = {
      id: Date.now(),
      text,
      completed: false,
      createdAt: Date.now()
    }

    setAddingId(newTodo.id)
    setTodos(prev => [newTodo, ...prev])
    setInputValue('')
    inputRef.current?.focus()

    setTimeout(() => setAddingId(null), 300)
  }

  // 删除 Todo
  const deleteTodo = (id: number) => {
    setRemovingIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      setTodos(prev => prev.filter(todo => todo.id !== id))
      setRemovingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 300)
  }

  // 切换完成状态
  const toggleTodo = (id: number) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    )
  }

  // 开始编辑
  const startEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setEditingText(todo.text)
  }

  // 保存编辑
  const saveEdit = () => {
    if (editingId === null) return
    const text = editingText.trim()
    if (!text) {
      deleteTodo(editingId)
    } else {
      setTodos(prev =>
        prev.map(todo =>
          todo.id === editingId ? { ...todo, text } : todo
        )
      )
    }
    setEditingId(null)
    setEditingText('')
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setEditingText('')
  }

  // 清除已完成
  const clearCompleted = () => {
    const completedIds = todos.filter(t => t.completed).map(t => t.id)
    setRemovingIds(new Set(completedIds))
    setTimeout(() => {
      setTodos(prev => prev.filter(todo => !todo.completed))
      setRemovingIds(new Set())
    }, 300)
  }

  // 筛选
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  // 统计
  const totalCount = todos.length
  const activeCount = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addTodo()
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1 className="title">📝 Todo List</h1>
          <p className="subtitle">管理你的日常任务</p>
        </header>

        {/* 输入区域 */}
        <div className="input-section">
          <input
            ref={inputRef}
            type="text"
            className="todo-input"
            placeholder="添加新任务..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="add-btn" onClick={addTodo} disabled={!inputValue.trim()}>
            添加
          </button>
        </div>

        {/* 筛选和统计 */}
        <div className="controls">
          <div className="filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              全部 ({totalCount})
            </button>
            <button
              className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              进行中 ({activeCount})
            </button>
            <button
              className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              已完成 ({completedCount})
            </button>
          </div>
          {completedCount > 0 && (
            <button className="clear-btn" onClick={clearCompleted}>
              清除已完成
            </button>
          )}
        </div>

        {/* 进度条 */}
        {totalCount > 0 && (
          <div className="progress-section">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="progress-text">
              {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}% 完成
            </span>
          </div>
        )}

        {/* Todo 列表 */}
        <ul className="todo-list">
          {filteredTodos.length === 0 && (
            <li className="empty-state">
              {totalCount === 0 ? '🎉 开始添加你的第一个任务吧！' : '当前分类下没有任务'}
            </li>
          )}
          {filteredTodos.map(todo => (
            <li
              key={todo.id}
              className={`todo-item ${todo.completed ? 'completed' : ''} ${
                removingIds.has(todo.id) ? 'removing' : ''
              } ${addingId === todo.id ? 'adding' : ''}`}
            >
              {editingId === todo.id ? (
                <div className="edit-container">
                  <input
                    ref={editInputRef}
                    type="text"
                    className="edit-input"
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={saveEdit}
                  />
                </div>
              ) : (
                <>
                  <button
                    className={`checkbox ${todo.completed ? 'checked' : ''}`}
                    onClick={() => toggleTodo(todo.id)}
                  >
                    {todo.completed && '✓'}
                  </button>
                  <span className="todo-text" onDoubleClick={() => startEdit(todo)}>
                    {todo.text}
                  </span>
                  <div className="actions">
                    <button className="edit-btn" onClick={() => startEdit(todo)}>
                      ✏️
                    </button>
                    <button className="delete-btn" onClick={() => deleteTodo(todo.id)}>
                      🗑️
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {/* 底部信息 */}
        <footer className="footer">
          <p>💡 双击任务可快速编辑</p>
        </footer>
      </div>
    </div>
  )
}

export default App
