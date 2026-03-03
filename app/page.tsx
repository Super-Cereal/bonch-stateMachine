'use client';

import { useState } from 'react';
import { AutomatonConfig, classifyCharForNumber, generateId, initialAutomata } from '../lib/automata';

interface Step {
  step: number;
  input: string;
  fromState: string;
  toState: string;
  isValid: boolean;
}

export default function Home() {
  const [automata, setAutomata] = useState<AutomatonConfig[]>(initialAutomata);
  const [selectedId, setSelectedId] = useState<string>(initialAutomata[0].id);
  const [viewMode, setViewMode] = useState<'simulator' | 'editor'>('simulator');
  
  // Состояния симулятора
  const [inputString, setInputString] = useState<string>('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string>('');

  // Состояния редактора
  const [editorConfig, setEditorConfig] = useState<Partial<AutomatonConfig>>({
    name: '',
    states: [],
    inputs: [],
    startState: '',
    finalStates: [],
    tokenMode: 'char',
    table: {}
  });
  const [editorStep, setEditorStep] = useState<1 | 2>(1); // 1: Basic Info, 2: Table

  const currentAutomaton = automata.find(a => a.id === selectedId) || automata[0];

  // --- Логика Симулятора ---
  const runSimulation = () => {
    setSteps([]);
    setResult(null);
    setError('');

    if (!inputString.trim()) {
      setError('Введите строку для проверки');
      return;
    }

    let currentState = currentAutomaton.startState;
    const newSteps: Step[] = [];
    let isRejected = false;
    let rejectReason = '';

    let tokens: string[] = [];
    if (currentAutomaton.tokenMode === 'word') {
      tokens = inputString.trim().split(/\s+/);
    } else {
      tokens = inputString.trim().split('');
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let inputSymbol = token;
      
      if (currentAutomaton.id === 'number') {
        const classified = classifyCharForNumber(token);
        if (!classified) {
          isRejected = true;
          rejectReason = `Недопустимый символ: "${token}"`;
          newSteps.push({ step: i + 1, input: token, fromState: currentState, toState: 'ERROR', isValid: false });
          break;
        }
        inputSymbol = classified;
      }

      const stateTransitions = currentAutomaton.table[currentState];
      let nextState = stateTransitions ? stateTransitions[inputSymbol] : undefined;

      if (!nextState) {
        isRejected = true;
        rejectReason = `Нет перехода из "${currentState}" по символу "${inputSymbol}"`;
        newSteps.push({ step: i + 1, input: inputSymbol, fromState: currentState, toState: 'ERROR', isValid: false });
        break;
      }

      if (nextState.startsWith('О ')) {
        isRejected = true;
        rejectReason = `Ошибка автомата: ${nextState}`;
        newSteps.push({ step: i + 1, input: inputSymbol, fromState: currentState, toState: nextState, isValid: false });
        break;
      }

      newSteps.push({ step: i + 1, input: inputSymbol, fromState: currentState, toState: nextState, isValid: true });
      currentState = nextState;
    }

    setSteps(newSteps);

    if (isRejected) {
      setResult('reject');
      setError(rejectReason);
    } else {
      if (currentAutomaton.checkEndState) {
        if (currentAutomaton.finalStates.includes(currentState)) {
          setResult('accept');
        } else {
          setResult('reject');
          setError(`Число не завершено корректно в состоянии ${currentState}`);
        }
      } else {
        if (currentAutomaton.finalStates.includes(currentState)) {
          setResult('accept');
        } else {
          setResult('reject');
          setError(`Конечное состояние "${currentState}" не является допускающим`);
        }
      }
    }
  };

  // --- Логика Редактора ---
  const startNewAutomaton = () => {
    setEditorConfig({
      name: '',
      states: [],
      inputs: [],
      startState: '',
      finalStates: [],
      tokenMode: 'char',
      table: {},
      isCustom: true
    });
    setEditorStep(1);
    setViewMode('editor');
  };

  const handleBasicInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorConfig.name || !editorConfig.startState || editorConfig.states?.length === 0) {
      alert('Заполните имя, состояния и начальное состояние');
      return;
    }
    // Инициализация пустой таблицы
    const table: Record<string, Record<string, string>> = {};
    editorConfig.states?.forEach(state => {
      table[state] = {};
      editorConfig.inputs?.forEach(input => {
        table[state][input] = ''; // Пусто по умолчанию
      });
    });
    setEditorConfig({ ...editorConfig, table });
    setEditorStep(2);
  };

  const handleTableChange = (state: string, input: string, value: string) => {
    if (editorConfig.table) {
      setEditorConfig({
        ...editorConfig,
        table: {
          ...editorConfig.table,
          [state]: {
            ...(editorConfig.table[state] || {}),
            [input]: value
          }
        }
      });
    }
  };

  const saveAutomaton = () => {
    if (!editorConfig.name || !editorConfig.startState) return;
    
    // Очистка пустых переходов из таблицы для чистоты
    const cleanTable: Record<string, Record<string, string>> = {};
    Object.entries(editorConfig.table || {}).forEach(([state, transitions]) => {
      const cleanTransitions: Record<string, string> = {};
      Object.entries(transitions).forEach(([input, next]) => {
        if (next.trim() !== '') {
          cleanTransitions[input] = next.trim();
        }
      });
      if (Object.keys(cleanTransitions).length > 0) {
        cleanTable[state] = cleanTransitions;
      }
    });

    const newAutomaton: AutomatonConfig = {
      id: generateId(),
      name: editorConfig.name,
      description: 'Пользовательский автомат',
      startState: editorConfig.startState,
      finalStates: editorConfig.finalStates || [],
      states: editorConfig.states || [],
      inputs: editorConfig.inputs || [],
      table: cleanTable,
      tokenMode: editorConfig.tokenMode as 'char' | 'word',
      isCustom: true
    };

    setAutomata([...automata, newAutomaton]);
    setSelectedId(newAutomaton.id);
    setViewMode('simulator');
  };

  const deleteCustomAutomaton = (id: string) => {
    const newAutomata = automata.filter(a => a.id !== id);
    setAutomata(newAutomata);
    if (selectedId === id && newAutomata.length > 0) {
      setSelectedId(newAutomata[0].id);
    }
  };

  // --- Рендер ---
  return (
    <div className="min-h-screen p-8 bg-gray-50 text-gray-800 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">
        Лабораторная работа: Конечные Распознаватели
      </h1>
      
      <div className="max-w-6xl mx-auto mb-8 flex justify-center gap-4">
        <button 
          onClick={() => setViewMode('simulator')}
          className={`px-6 py-2 rounded font-semibold ${viewMode === 'simulator' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
        >
          Симулятор
        </button>
        <button 
          onClick={startNewAutomaton}
          className={`px-6 py-2 rounded font-semibold ${viewMode === 'editor' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'}`}
        >
          Конструктор Автомата
        </button>
      </div>

      {viewMode === 'simulator' ? (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Левая колонка: Управление */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Выберите автомат</h2>
              <select 
                value={selectedId} 
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setSteps([]);
                  setResult(null);
                  setInputString('');
                }}
                className="w-full p-2 border border-gray-300 rounded mb-4"
              >
                {automata.map(auto => (
                  <option key={auto.id} value={auto.id}>{auto.name} {auto.isCustom ? '(Мой)' : ''}</option>
                ))}
              </select>
              
              {currentAutomaton.isCustom && (
                <button 
                  onClick={() => deleteCustomAutomaton(currentAutomaton.id)}
                  className="text-xs text-red-500 hover:text-red-700 mb-4 underline"
                >
                  Удалить этот автомат
                </button>
              )}

              <p className="text-sm text-gray-500 mb-4">{currentAutomaton.description}</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Входная строка</label>
                <input 
                  type="text" 
                  value={inputString}
                  onChange={(e) => setInputString(e.target.value)}
                  placeholder={currentAutomaton.tokenMode === 'word' ? "СЛОВО1 СЛОВО2" : "abc123"}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>

              <button 
                onClick={runSimulation}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
              >
                Проверить
              </button>

              {result && (
                <div className={`mt-4 p-3 rounded text-center font-bold ${result === 'accept' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {result === 'accept' ? 'ПРИНЯТО' : 'ОТКЛОНЕНО'}
                  {error && <div className="text-xs font-normal mt-1">{error}</div>}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="font-semibold mb-2">Параметры (A = &lt;X, Q, ψ, q0, F&gt;)</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Q (Состояния):</strong> {currentAutomaton.states.join(', ')}</li>
                <li><strong>X (Вход):</strong> {currentAutomaton.inputs.join(', ')}</li>
                <li><strong>q0 (Старт):</strong> {currentAutomaton.startState}</li>
                <li><strong>F (Финальные):</strong> {currentAutomaton.finalStates.join(', ')}</li>
              </ul>
            </div>
          </div>

          {/* Правая колонка: Таблицы */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
              <h2 className="text-xl font-semibold mb-4">Таблица переходов (ψ)</h2>
              <table className="min-w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">Q \ X</th>
                    {currentAutomaton.inputs.map(inp => (
                      <th key={inp} className="p-2 border">{inp}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentAutomaton.states.map(state => (
                    <tr key={state} className={currentAutomaton.finalStates.includes(state) ? 'bg-green-50' : ''}>
                      <td className="p-2 border font-medium">{state}</td>
                      {currentAutomaton.inputs.map(inp => {
                        const next = currentAutomaton.table[state]?.[inp] || '-';
                        return (
                          <td key={inp} className="p-2 border text-gray-600">
                            {next}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {steps.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
                <h2 className="text-xl font-semibold mb-4">Протокол работы</h2>
                <table className="min-w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="p-2 border">Шаг</th>
                      <th className="p-2 border">Вход</th>
                      <th className="p-2 border">Из</th>
                      <th className="p-2 border">В</th>
                      <th className="p-2 border">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {steps.map((s, idx) => (
                      <tr key={idx} className={s.isValid ? '' : 'bg-red-50'}>
                        <td className="p-2 border">{s.step}</td>
                        <td className="p-2 border font-mono">{s.input}</td>
                        <td className="p-2 border">{s.fromState}</td>
                        <td className="p-2 border font-bold">{s.toState}</td>
                        <td className="p-2 border">{s.isValid ? '✅' : '❌'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // --- РЕДАКТОР ---
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6">Конструктор Конечного Распознавателя</h2>
          
          {editorStep === 1 ? (
            <form onSubmit={handleBasicInfoSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Название автомата</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-2 border rounded"
                  value={editorConfig.name}
                  onChange={e => setEditorConfig({...editorConfig, name: e.target.value})}
                  placeholder="Например: Четное количество нулей"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Состояния (Q) через запятую</label>
                  <input 
                    required
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={editorConfig.states?.join(', ')}
                    onChange={e => setEditorConfig({...editorConfig, states: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}
                    placeholder="q0, q1, q2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Входной алфавит (X) через запятую</label>
                  <input 
                    required
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={editorConfig.inputs?.join(', ')}
                    onChange={e => setEditorConfig({...editorConfig, inputs: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}
                    placeholder="0, 1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium">Начальное состояние (q0)</label>
                  <input 
                    required
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={editorConfig.startState}
                    onChange={e => setEditorConfig({...editorConfig, startState: e.target.value.trim()})}
                    placeholder="q0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Финальные состояния (F) через запятую</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded"
                    value={editorConfig.finalStates?.join(', ')}
                    onChange={e => setEditorConfig({...editorConfig, finalStates: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}
                    placeholder="q1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Режим ввода</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={editorConfig.tokenMode}
                  onChange={e => setEditorConfig({...editorConfig, tokenMode: e.target.value as 'char' | 'word'})}
                >
                  <option value="char">По символам (например, 0101)</option>
                  <option value="word">По словам (например, КОТ ИДЕТ)</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
                Далее: Таблица переходов
              </button>
              <button type="button" onClick={() => setViewMode('simulator')} className="w-full mt-2 text-gray-500">
                Отмена
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded mb-4">
                <h3 className="font-bold">Заполните таблицу переходов ψ</h3>
                <p className="text-sm">Оставьте клетку пустой, если перехода нет (ошибка).</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 border">Q \ X</th>
                      {editorConfig.inputs?.map(inp => (
                        <th key={inp} className="p-2 border min-w-[100px]">{inp}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editorConfig.states?.map(state => (
                      <tr key={state}>
                        <td className={`p-2 border font-bold ${editorConfig.finalStates?.includes(state) ? 'bg-green-100' : ''}`}>
                          {state} {editorConfig.startState === state ? '(Старт)' : ''}
                        </td>
                        {editorConfig.inputs?.map(inp => (
                          <td key={inp} className="p-2 border">
                            <input 
                              type="text" 
                              className="w-full p-1 border rounded text-center"
                              value={editorConfig.table?.[state]?.[inp] || ''}
                              onChange={e => handleTableChange(state, inp, e.target.value)}
                              placeholder="-"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setEditorStep(1)} className="px-4 py-2 border rounded">
                  Назад
                </button>
                <button onClick={saveAutomaton} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">
                  Сохранить и Тестировать
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}