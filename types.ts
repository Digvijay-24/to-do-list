
export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface ResearchResult {
  summary: string;
  sources: {
    uri: string;
    title: string;
  }[];
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  subtasks?: Subtask[];
  research?: ResearchResult | null;
  dueDate?: string;
}

export type ModalType = 'subtasks' | 'research';

export interface ModalContent {
  type: ModalType;
  todo: Todo;
}
