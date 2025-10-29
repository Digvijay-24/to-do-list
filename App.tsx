import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Todo, ModalContent } from './types';
import { breakDownTask, researchTopic, readTextAloud } from './services/geminiService';
import { Modal } from './components/Modal';
import {
  ListBulletIcon,
  DocumentMagnifyingGlassIcon,
  SpeakerWaveIcon,
  TrashIcon,
  PlusIcon,
  MicrophoneIcon,
  CalendarIcon,
  AlertTriangleIcon,
  XMarkIcon
} from './components/IconComponents';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      const savedTodos = localStorage.getItem('todos');
      return savedTodos ? JSON.parse(savedTodos) : [];
    } catch (error) {
      console.error("Could not parse todos from localStorage", error);
      return [];
    }
  });
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [modalContent, setModalContent] = useState<ModalContent | null>(null);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [dueAlerts, setDueAlerts] = useState<Todo[]>([]);
  const [showDueAlertBanner, setShowDueAlertBanner] = useState(true);

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    const checkDueDates = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1);

      const newAlerts = todos.filter(todo => {
        if (todo.completed || !todo.dueDate) return false;
        const dueDate = new Date(todo.dueDate);
        return dueDate < now || (dueDate >= now && dueDate <= tomorrow);
      });
      
      const currentAlertIds = new Set(dueAlerts.map(t => t.id));
      const newAlertIds = new Set(newAlerts.map(t => t.id));

      const alertsHaveChanged = currentAlertIds.size !== newAlertIds.size || ![...newAlertIds].every(id => currentAlertIds.has(id));

      if (alertsHaveChanged) {
        setDueAlerts(newAlerts);
        if (newAlerts.length > 0) {
          setShowDueAlertBanner(true);
        }
      }
    };

    checkDueDates();
    const interval = setInterval(checkDueDates, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [todos, dueAlerts]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);

        if (transcript.trim()) {
            const newTodo: Todo = {
              id: self.crypto.randomUUID(),
              text: transcript.trim(),
              completed: false,
            };
            setTodos(prevTodos => [newTodo, ...prevTodos]);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTodoText(e.target.value);
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTodoDueDate(e.target.value);
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim() === '') return;

    const newTodo: Todo = {
      id: self.crypto.randomUUID(),
      text: newTodoText,
      completed: false,
      dueDate: newTodoDueDate || undefined
    };
    setTodos([newTodo, ...todos]);
    setNewTodoText('');
    setNewTodoDueDate('');
  };

  const handleToggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleDeleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };
  
  const handleDoubleClick = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditingTodoText(todo.text);
  };
  
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTodoText(e.target.value);
  };
  
  const handleEditSubmit = (id: string) => {
    if (editingTodoText.trim() === '') {
        handleDeleteTodo(id);
    } else {
        setTodos(todos.map(todo => todo.id === id ? { ...todo, text: editingTodoText.trim() } : todo));
    }
    setEditingTodoId(null);
    setEditingTodoText('');
  };
  
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
      if (e.key === 'Enter') {
          handleEditSubmit(id);
      } else if (e.key === 'Escape') {
          setEditingTodoId(null);
          setEditingTodoText('');
      }
  };
  
  const handleToggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const setTodoLoadingState = (id: string, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [id]: isLoading }));
  };

  const handleBreakDownTask = async (todo: Todo) => {
    if (todo.subtasks) {
      setModalContent({ type: 'subtasks', todo });
      return;
    }
    setTodoLoadingState(todo.id, true);
    try {
      const subtasks = await breakDownTask(todo.text);
      const updatedTodos = todos.map((t) =>
        t.id === todo.id ? { ...t, subtasks } : t
      );
      setTodos(updatedTodos);
      const updatedTodo = updatedTodos.find(t => t.id === todo.id);
      if (updatedTodo) {
        setModalContent({ type: 'subtasks', todo: updatedTodo });
      }
    } catch (error) {
      console.error(error);
      alert('Failed to break down task.');
    } finally {
      setTodoLoadingState(todo.id, false);
    }
  };

  const handleResearchTopic = async (todo: Todo) => {
    if (todo.research) {
      setModalContent({ type: 'research', todo });
      return;
    }
    setTodoLoadingState(todo.id, true);
    try {
      const researchResult = await researchTopic(todo.text);
      const updatedTodos = todos.map((t) =>
        t.id === todo.id ? { ...t, research: researchResult } : t
      );
      setTodos(updatedTodos);
      const updatedTodo = updatedTodos.find(t => t.id === todo.id);
       if (updatedTodo) {
        setModalContent({ type: 'research', todo: updatedTodo });
      }
    } catch (error) {
      console.error(error);
      alert('Failed to research topic.');
    } finally {
      setTodoLoadingState(todo.id, false);
    }
  };

  const handleSubtaskToggle = (todoId: string, subtaskId: string) => {
    const updatedTodos = todos.map((todo) => {
      if (todo.id === todoId) {
        const updatedSubtasks = todo.subtasks?.map((subtask) =>
          subtask.id === subtaskId
            ? { ...subtask, completed: !subtask.completed }
            : subtask
        );
        return { ...todo, subtasks: updatedSubtasks };
      }
      return todo;
    });
    setTodos(updatedTodos);

    if (modalContent && modalContent.todo.id === todoId) {
       const updatedTodo = updatedTodos.find(t => t.id === todoId);
       if (updatedTodo) {
        setModalContent({ ...modalContent, todo: updatedTodo });
       }
    }
  };

  const handleReadTodosAloud = async () => {
    if (isReadingAloud && audioPlayer) {
      audioPlayer.pause();
      setIsReadingAloud(false);
      return;
    }
    setIsReadingAloud(true);
    try {
      const todoListText = todos
        .filter(t => !t.completed)
        .map(t => t.text)
        .join('. ');
      if (!todoListText) {
          alert("No active todos to read.");
          setIsReadingAloud(false);
          return;
      }
      const base64Audio = await readTextAloud(todoListText);
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        setAudioPlayer(audio);
        audio.play();
        audio.onended = () => setIsReadingAloud(false);
      } else {
        setIsReadingAloud(false);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to read todos aloud.');
      setIsReadingAloud(false);
    }
  };
  
  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active':
        return todos.filter(todo => !todo.completed);
      case 'completed':
        return todos.filter(todo => todo.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  const getDueDateInfo = (dueDate: string | undefined) => {
    if (!dueDate) return { text: '', colorClass: '' };

    const date = new Date(dueDate);
    const now = new Date();
    const isPast = date < now;
    
    // Resetting time for date-only comparison
    date.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (isPast && diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} day(s)`, colorClass: 'text-red-400', alertClass: 'border-l-4 border-red-500' };
    if (diffDays === 0) return { text: 'Due today', colorClass: 'text-yellow-400', alertClass: 'border-l-4 border-yellow-500' };
    if (diffDays === 1) return { text: 'Due tomorrow', colorClass: 'text-cyan-400' };
    
    const formattedDate = new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return { text: `Due ${formattedDate}`, colorClass: 'text-gray-400' };
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans">
      <div className="container mx-auto max-w-3xl p-4 sm:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            Gemini-Powered Todo List
          </h1>
          <p className="text-gray-400 mt-2">
            Supercharge your productivity with AI.
          </p>
        </header>
        
        {dueAlerts.length > 0 && showDueAlertBanner && (
          <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-lg relative mb-6 flex items-start gap-3" role="alert">
            <AlertTriangleIcon />
            <div className="flex-grow">
              <strong className="font-bold">Heads up! </strong>
              <span className="block sm:inline">{dueAlerts.length} task(s) are due soon or overdue.</span>
            </div>
            <button onClick={() => setShowDueAlertBanner(false)} className="p-1 -mt-1 -mr-1">
              <XMarkIcon />
            </button>
          </div>
        )}

        <div className="bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
          <form onSubmit={handleAddTodo} className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <input
              type="text"
              value={newTodoText}
              onChange={handleInputChange}
              placeholder={isListening ? 'Listening...' : 'What needs to be done?'}
              className="flex-grow bg-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-3 border-2 border-transparent focus:border-cyan-500 focus:ring-0 transition"
            />
            <input
                type="date"
                value={newTodoDueDate}
                onChange={handleDateChange}
                className="bg-gray-700 text-white rounded-lg px-3 py-3 border-2 border-transparent focus:border-cyan-500 focus:ring-0 transition"
                min={new Date().toISOString().split("T")[0]}
            />
            {recognitionRef.current && (
                 <button type="button" onClick={handleToggleVoiceInput} className={`p-3 rounded-lg transition-colors ${isListening ? 'bg-red-500 text-white' : 'bg-gray-700 text-cyan-400 hover:bg-gray-600'}`}>
                    <MicrophoneIcon />
                </button>
            )}
            <button
              type="submit"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold p-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!newTodoText.trim()}
            >
              <PlusIcon />
            </button>
          </form>
        </div>
        
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 bg-gray-800 p-1 rounded-lg">
                {(['all', 'active', 'completed'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === f ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>
            {/* Desktop "Read Todos" Button */}
            <button
                onClick={handleReadTodosAloud}
                disabled={todos.filter(t => !t.completed).length === 0}
                className="hidden sm:flex items-center gap-2 bg-gray-700 text-cyan-400 font-semibold px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <SpeakerWaveIcon />
                {isReadingAloud ? 'Stop Reading' : 'Read Active Todos'}
            </button>
        </div>

        <div className="space-y-4">
          {filteredTodos.map((todo) => {
            const isEditing = editingTodoId === todo.id;
            const dueDateInfo = getDueDateInfo(todo.dueDate);
            const alertClass = dueAlerts.some(a => a.id === todo.id) ? dueDateInfo.alertClass : '';

            return (
            <div
              key={todo.id}
              onDoubleClick={() => !todo.completed && handleDoubleClick(todo)}
              className={`bg-gray-800 rounded-2xl shadow-md p-4 flex items-center justify-between gap-4 transition-all hover:shadow-cyan-500/20 ${alertClass}`}
            >
              <div className="flex items-center flex-grow min-w-0">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggleTodo(todo.id)}
                  className="h-6 w-6 rounded-md bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-600 focus:ring-offset-gray-800 shrink-0"
                />
                {isEditing ? (
                  <input
                    type="text"
                    value={editingTodoText}
                    onChange={handleEditChange}
                    onBlur={() => handleEditSubmit(todo.id)}
                    onKeyDown={(e) => handleEditKeyDown(e, todo.id)}
                    className="ml-4 text-lg bg-gray-700 text-gray-100 w-full rounded-md px-2 py-1"
                    autoFocus
                  />
                ) : (
                  <div className="ml-4 min-w-0">
                    <span className={`text-lg ${todo.completed ? 'line-through text-gray-500' : 'text-gray-200'} truncate block`}>
                      {todo.text}
                    </span>
                    {todo.dueDate && (
                      <div className={`flex items-center gap-1.5 text-xs mt-1 ${dueDateInfo.colorClass}`}>
                          <CalendarIcon />
                          <span>{dueDateInfo.text}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!isEditing && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleBreakDownTask(todo)}
                  disabled={loadingStates[todo.id]}
                  className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title={todo.subtasks ? "View Sub-tasks" : "Break down into sub-tasks"}
                >
                  <ListBulletIcon />
                </button>
                <button
                  onClick={() => handleResearchTopic(todo)}
                  disabled={loadingStates[todo.id]}
                  className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title={todo.research ? "View Research" : "Research Topic"}
                >
                  <DocumentMagnifyingGlassIcon />
                </button>
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-700 transition-colors"
                  title="Delete Task"
                >
                  <TrashIcon />
                </button>
              </div>
              )}
            </div>
          )})}
        </div>
        
        {/* Mobile Floating Action Button */}
        <button
          onClick={handleReadTodosAloud}
          disabled={todos.filter(t => !t.completed).length === 0}
          className={`sm:hidden fixed bottom-6 right-6 p-4 rounded-full text-white shadow-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed z-20 ${isReadingAloud ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-500 to-blue-600'}`}
          aria-label={isReadingAloud ? 'Stop reading todos' : 'Read active todos aloud'}
        >
          {isReadingAloud ? <XMarkIcon /> : <SpeakerWaveIcon />}
        </button>

        {todos.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            <p>Your to-do list is empty.</p>
            <p>Add a task to get started!</p>
          </div>
        )}

        {modalContent && (
          <Modal
            todo={modalContent.todo}
            type={modalContent.type}
            onClose={() => setModalContent(null)}
            onSubtaskToggle={handleSubtaskToggle}
          />
        )}
      </div>
    </div>
  );
};

export default App;