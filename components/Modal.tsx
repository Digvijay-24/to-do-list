
import React from 'react';
import { Todo, Subtask } from '../types';
import { XMarkIcon } from './IconComponents';

interface ModalProps {
  todo: Todo;
  type: 'subtasks' | 'research';
  onClose: () => void;
  onSubtaskToggle: (todoId: string, subtaskId: string) => void;
}

export const Modal: React.FC<ModalProps> = ({ todo, type, onClose, onSubtaskToggle }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-cyan-400">{type === 'subtasks' ? 'Sub-tasks' : 'Research'}</h2>
            <p className="text-gray-400 mt-1 truncate pr-4">{todo.text}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700">
            <XMarkIcon />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {type === 'subtasks' && (
            <ul className="space-y-3">
              {todo.subtasks?.map((subtask) => (
                <li key={subtask.id} className="flex items-center bg-gray-900/50 p-3 rounded-lg">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => onSubtaskToggle(todo.id, subtask.id)}
                    className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-600 focus:ring-offset-gray-800"
                  />
                  <span className={`ml-3 ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                    {subtask.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {type === 'research' && (
            <div className="space-y-6">
              <div className="prose prose-invert max-w-none text-gray-300">
                <p>{todo.research?.summary}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-3">Sources</h3>
                <ul className="space-y-2">
                  {todo.research?.sources.map((source, index) => (
                    <li key={index} className="bg-gray-900/50 p-3 rounded-lg">
                      <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline break-all">
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
