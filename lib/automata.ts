// lib/automata.ts

export type TransitionTable = Record<string, Record<string, string>>;

export interface AutomatonConfig {
  id: string;
  name: string;
  description: string;
  startState: string;
  finalStates: string[];
  states: string[];
  statesDesc?: string[];
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
  startState: 'Подлежащее',
  finalStates: ['FIN'],
  states: ['Подлежащее', 'Сказуемое', 'FIN'],
  inputs: ['КОТ', 'ПЕС', 'ОН', 'ИДЕТ', 'ЛЕЖИТ'],
  tokenMode: 'word',
  table: {
    'Подлежащее': { 'КОТ': 'Сказуемое', 'ПЕС': 'Сказуемое', 'ОН': 'Сказуемое' },
    'Сказуемое': { 'ИДЕТ': 'FIN', 'ЛЕЖИТ': 'FIN' },
    'FIN': {}
  }
};

export const automatonNumber: AutomatonConfig = {
  id: 'number',
  name: 'Вещественная константа (Пример 2)',
  description: 'Анализ записи вещественного числа (цифры, точка, e, +/-)',
  startState: 'Пустое',
  finalStates: ['Целое', 'Вещественное', 'eЧисло'],
  states: ['Пустое', 'Целое', 'Точка', 'Вещественное', 'e', 'e+-', 'eЧисло'],
  inputs: ['Цифра', 'Точка', 'e', '+/-'],
  tokenMode: 'char',
  checkEndState: true,
  table: {
    'Пустое': { 'Цифра': 'Целое', 'Точка': 'Точка', '+/-': 'Целое' },
    'Целое': { 'Цифра': 'Целое', 'Точка': 'Вещественное', 'e': 'e'},
    'Точка': { 'Цифра': 'Вещественное', },
    'Вещественное': { 'Цифра': 'Вещественное',  'e': 'e'},
    'e': { 'Цифра': 'eЧисло',  '+/-': 'e+-' },
    'e+-': { 'Цифра': 'eЧисло', },
    'eЧисло': { 'Цифра': 'eЧисло', },
  }
};

export const automatonCustomPreset: AutomatonConfig = {
  id: 'custom_preset',
  name: 'Ровно одна "b"',
  description: 'Принимает строки из {a, b}, содержащие ровно одну букву "b".',
  startState: 'Только "a"',
  finalStates: ['Одна "b"'],
  states: ['Только "a"', 'Одна "b"'],
  inputs: ['a', 'b'],
  tokenMode: 'char',
  table: {
    'Только "a"': { 'a': 'Только "a"', 'b': 'Одна "b"' },
    'Одна "b"': { 'a': 'Одна "b"' },
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