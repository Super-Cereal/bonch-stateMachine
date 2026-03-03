// lib/automata.ts

export type TransitionTable = Record<string, Record<string, string>>;

export interface AutomatonConfig {
  id: string;
  name: string;
  description: string;
  startState: string;
  finalStates: string[];
  states: string[];
  inputs: string[];
  table: TransitionTable;
  tokenMode: 'char' | 'word'; 
  checkEndState?: boolean; 
  isCustom?: boolean; // Флаг для пользовательских автоматов
}

// Пресеты из файла
export const automatonG0: AutomatonConfig = {
  id: 'g0',
  name: 'Грамматика G0 (Пример 1)',
  description: 'Распознавание предложений: "КОТ ИДЕТ", "ОН ЛЕЖИТ" и т.д.',
  startState: '<Пр>',
  finalStates: ['FIN'],
  states: ['<Пр>', '<С>', 'FIN'],
  inputs: ['КОТ', 'ПЕС', 'ОН', 'ИДЕТ', 'ЛЕЖИТ'],
  tokenMode: 'word',
  table: {
    '<Пр>': { 'КОТ': '<С>', 'ПЕС': '<С>', 'ОН': '<С>' },
    '<С>': { 'ИДЕТ': 'FIN', 'ЛЕЖИТ': 'FIN' },
    'FIN': {}
  }
};

export const automatonNumber: AutomatonConfig = {
  id: 'number',
  name: 'Вещественная константа (Пример 2)',
  description: 'Анализ записи вещественного числа (цифры, точка, e, +/-)',
  startState: '1',
  finalStates: ['2', '4', '7'],
  states: ['1', '2', '3', '4', '5', '6', '7'],
  inputs: ['Цифра', 'Точка', 'e', '+/-'],
  tokenMode: 'char',
  checkEndState: true,
  table: {
    '1': { 'Цифра': '2', 'Точка': '3', 'e': 'О 7', '+/-': '2' },
    '2': { 'Цифра': '2', 'Точка': '4', 'e': '5', '+/-': 'О 4' },
    '3': { 'Цифра': '4', 'Точка': 'О 1', 'e': 'О 2', '+/-': 'О 4' },
    '4': { 'Цифра': '4', 'Точка': 'О 1', 'e': '5', '+/-': 'О 4' },
    '5': { 'Цифра': '7', 'Точка': 'О 1', 'e': 'О 3', '+/-': '6' },
    '6': { 'Цифра': '7', 'Точка': 'О 1', 'e': 'О 3', '+/-': 'О 4' },
    '7': { 'Цифра': '7', 'Точка': 'О 1', 'e': 'О 3', '+/-': 'О 4' },
  }
};

export const automatonCustomPreset: AutomatonConfig = {
  id: 'custom_preset',
  name: 'Пользовательский (Ровно одна "b")',
  description: 'Принимает строки из {a, b}, содержащие ровно одну букву "b".',
  startState: 'q0',
  finalStates: ['q1'],
  states: ['q0', 'q1', 'q2'],
  inputs: ['a', 'b'],
  tokenMode: 'char',
  table: {
    'q0': { 'a': 'q0', 'b': 'q1' },
    'q1': { 'a': 'q1', 'b': 'q2' },
    'q2': { 'a': 'q2', 'b': 'q2' },
  }
};

export const initialAutomata: AutomatonConfig[] = [automatonG0, automatonNumber, automatonCustomPreset];

// Helper для классификации символов в автомате чисел
export function classifyCharForNumber(char: string): string | null {
  if (/\d/.test(char)) return 'Цифра';
  if (char === '.') return 'Точка';
  if (char === 'e' || char === 'E') return 'e';
  if (char === '+' || char === '-') return '+/-';
  return null;
}

// Генерация уникального ID
export const generateId = () => `custom_${Date.now()}`;