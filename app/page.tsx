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

export default function AutomataLab() {
  const [automata, setAutomata] = useState<AutomatonConfig[]>(initialAutomata);
  const [selectedId, setSelectedId] = useState<string>(initialAutomata[0].id);
  const [viewMode, setViewMode] = useState<'simulator' | 'editor'>('simulator');

  // Simulator states
  const [inputString, setInputString] = useState<string>('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string>('');

  // Editor states
  const [editorConfig, setEditorConfig] = useState<Partial<AutomatonConfig>>({
    name: '',
    states: [],
    inputs: [],
    startState: '',
    finalStates: [],
    tokenMode: 'char',
    table: {}
  });
  const [editorStep, setEditorStep] = useState<1 | 2>(1);

  const currentAutomaton = automata.find(a => a.id === selectedId) || automata[0];

  // ==================== Симулятор ====================
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

    const tokens = currentAutomaton.tokenMode === 'word'
      ? inputString.trim().split(/\s+/)
      : inputString.trim().split('');

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
      const nextState = stateTransitions?.[inputSymbol];

      if (!nextState) {
        isRejected = true;
        rejectReason = `Нет перехода из "${currentState}" по символу "${inputSymbol}"`;
        newSteps.push({ step: i + 1, input: inputSymbol, fromState: currentState, toState: 'ERROR', isValid: false });
        break;
      }

      if (nextState.startsWith('О ')) {
        isRejected = true;
        rejectReason = `Ошибка: ${nextState}`;
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
      const isFinal = currentAutomaton.finalStates.includes(currentState);
      if (isFinal) {
        setResult('accept');
      } else {
        setResult('reject');
        setError(currentAutomaton.checkEndState 
          ? `Число не завершено корректно в состоянии ${currentState}` 
          : `Конечное состояние "${currentState}" не является допускающим`);
      }
    }
  };

  // ==================== Редактор ====================
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
    if (!editorConfig.name || !editorConfig.startState || !editorConfig.states?.length) {
      alert('Пожалуйста, заполните название, состояния и начальное состояние');
      return;
    }

    const table: Record<string, Record<string, string>> = {};
    editorConfig.states?.forEach(state => {
      table[state] = {};
      editorConfig.inputs?.forEach(input => {
        table[state][input] = '';
      });
    });

    setEditorConfig({ ...editorConfig, table });
    setEditorStep(2);
  };

  const handleTableChange = (state: string, input: string, value: string) => {
    setEditorConfig(prev => ({
      ...prev,
      table: {
        ...(prev.table || {}),
        [state]: {
          ...(prev.table?.[state] || {}),
          [input]: value
        }
      }
    }));
  };

  const saveAutomaton = () => {
    if (!editorConfig.name || !editorConfig.startState) return;

    const cleanTable: Record<string, Record<string, string>> = {};
    Object.entries(editorConfig.table || {}).forEach(([state, transitions]) => {
      const cleanTransitions: Record<string, string> = {};
      Object.entries(transitions).forEach(([input, next]) => {
        if (next?.trim()) cleanTransitions[input] = next.trim();
      });
      if (Object.keys(cleanTransitions).length > 0) {
        cleanTable[state] = cleanTransitions;
      }
    });

    const newAutomaton: AutomatonConfig = {
      id: generateId(),
      name: editorConfig.name,
      description: 'Пользовательский конечный автомат',
      startState: editorConfig.startState,
      finalStates: editorConfig.finalStates || [],
      states: editorConfig.states || [],
      inputs: editorConfig.inputs || [],
      table: cleanTable,
      tokenMode: editorConfig.tokenMode as 'char' | 'word',
      isCustom: true
    };

    setAutomata(prev => [...prev, newAutomaton]);
    setSelectedId(newAutomaton.id);
    setViewMode('simulator');
  };

  const deleteCustomAutomaton = (id: string) => {
    const filtered = automata.filter(a => a.id !== id);
    setAutomata(filtered);
    if (selectedId === id && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-zinc-950 text-slate-200">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

          <div className="flex gap-3">
            <button
              onClick={() => setViewMode('simulator')}
              className={`px-6 py-2.5 rounded-2xl font-medium transition-all ${viewMode === 'simulator'
                  ? 'bg-white text-black shadow-lg shadow-white/20'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}`}
            >
              Симулятор
            </button>
            <button
              onClick={startNewAutomaton}
              className={`px-6 py-2.5 rounded-2xl font-medium transition-all ${viewMode === 'editor'
                  ? 'bg-white text-black shadow-lg shadow-white/20'
                  : 'bg-gradient-to-r from-violet-600 to-cyan-500 hover:brightness-110'}`}
            >
              + Новый автомат
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-10">
        {viewMode === 'simulator' ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Левая панель */}
            <div className="xl:col-span-4 space-y-6">
              <div className="bg-zinc-900/70 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                  <span>Выбор автомата</span>
                </h2>

                <select
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    setSteps([]);
                    setResult(null);
                    setInputString('');
                  }}
                  className="w-full bg-zinc-800 border border-white/10 rounded-2xl px-5 py-3.5 text-lg focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  {automata.map(auto => (
                    <option key={auto.id} value={auto.id}>
                      {auto.name} {auto.isCustom && '★'}
                    </option>
                  ))}
                </select>

                {currentAutomaton.isCustom && (
                  <button
                    onClick={() => deleteCustomAutomaton(currentAutomaton.id)}
                    className="mt-4 text-red-400 hover:text-red-500 text-sm flex items-center gap-2 transition"
                  >
                    🗑 Удалить автомат
                  </button>
                )}

                <div className="mt-8">
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {currentAutomaton.description}
                  </p>
                </div>

                <div className="mt-8 space-y-6">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Входная строка</label>
                    <input
                      type="text"
                      value={inputString}
                      onChange={(e) => {
                        setInputString(e.target.value)
                        setResult(null)
                      }}
                      placeholder={currentAutomaton.tokenMode === 'word' ? "Слова через пробел" : "Символы"}
                      className="w-full bg-zinc-800 border border-white/10 rounded-2xl px-5 py-4 text-lg font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    onClick={runSimulation}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-2xl font-semibold text-lg hover:brightness-110 transition-all active:scale-[0.985]"
                  >
                    Запустить симуляцию
                  </button>
                </div>

                {result && (
                  <div className={`mt-6 p-6 rounded-2xl text-center font-bold text-xl border ${result === 'accept'
                      ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-400'
                      : 'bg-red-950/50 border-red-500/50 text-red-400'}`}>
                    {result === 'accept' ? '✅ ПРИНЯТО' : '❌ ОТКЛОНЕНО'}
                    {error && <div className="mt-3 text-sm opacity-80 font-normal">{error}</div>}
                  </div>
                )}
              </div>

              {/* Параметры автомата */}
              <div className="bg-zinc-900/70 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                <h3 className="font-semibold text-lg mb-5">Параметры автомата</h3>
                <div className="space-y-4 text-sm">
                  <div><span className="text-slate-400">Состояния (Q):</span> <span className="font-mono">{currentAutomaton.states.join(', ')}</span></div>
                  <div><span className="text-slate-400">Алфавит (X):</span> <span className="font-mono">{currentAutomaton.inputs.join(', ')}</span></div>
                  <div><span className="text-slate-400">Начальное состояние:</span> <span className="font-mono text-cyan-400">{currentAutomaton.startState}</span></div>
                  <div><span className="text-slate-400">Допускающие состояния:</span> <span className="font-mono text-emerald-400">{currentAutomaton.finalStates.join(', ')}</span></div>
                </div>
              </div>
            </div>

            {/* Правая часть — таблицы */}
            <div className="xl:col-span-8 space-y-8">
              {/* Таблица переходов */}
              <div className="bg-zinc-900/70 border border-white/10 rounded-3xl p-8 backdrop-blur-xl overflow-hidden">
                <h2 className="text-2xl font-semibold mb-6">Таблица переходов</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="p-4 text-left font-medium text-slate-400">Состояние</th>
                        {currentAutomaton.inputs.map(inp => (
                          <th key={inp} className="p-4 text-center font-medium text-slate-400">{inp}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {currentAutomaton.states.map(state => (
                        <tr key={state} className={currentAutomaton.finalStates.includes(state) ? 'bg-emerald-950/30' : ''}>
                          <td className="p-4 font-mono font-medium">
                            {state}
                            {currentAutomaton.startState === state && <span className="text-cyan-400 ml-2">★</span>}
                            {currentAutomaton.finalStates?.includes(state) && <span className="text-emerald-400"> ✓</span>}
                          </td>
                          {currentAutomaton.inputs.map(inp => (
                            <td key={inp} className="p-4 text-center font-mono">
                              {currentAutomaton.table[state]?.[inp] || <span className="text-slate-600">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Протокол */}
              {steps.length > 0 && (
                <div className="bg-zinc-900/70 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                  <h2 className="text-2xl font-semibold mb-6">Протокол выполнения</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="p-4 text-left">Шаг</th>
                          <th className="p-4 text-left">Вход</th>
                          <th className="p-4 text-left">Из состояния</th>
                          <th className="p-4 text-left">В состояние</th>
                          <th className="p-4 text-center">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {steps.map((s, i) => (
                          <tr key={i} className={s.isValid ? '' : 'bg-red-950/40'}>
                            <td className="p-4 font-mono">{s.step}</td>
                            <td className="p-4 font-mono">{s.input}</td>
                            <td className="p-4 font-mono">{s.fromState}</td>
                            <td className="p-4 font-mono font-semibold">{s.toState}</td>
                            <td className="p-4 text-center text-xl">{s.isValid ? '✅' : '❌'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ==================== РЕДАКТОР ==================== */
          <div className="max-w-5xl mx-auto">
            <div className="bg-zinc-900/70 border border-white/10 rounded-3xl p-10">
              <h2 className="text-3xl font-bold mb-8">Конструктор автомата</h2>

              {editorStep === 1 ? (
                <form onSubmit={handleBasicInfoSubmit} className="space-y-8">
                  {/* Название */}
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Название автомата</label>
                    <input
                      type="text"
                      required
                      value={editorConfig.name}
                      onChange={e => setEditorConfig({ ...editorConfig, name: e.target.value })}
                      className="w-full bg-zinc-800 border border-white/10 rounded-2xl px-6 py-4 text-lg focus:border-violet-500 outline-none"
                      placeholder="Например: Распознавание палиндромов"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Состояния (через запятую)</label>
                      <input
                        type="text"
                        required
                        value={editorConfig.states?.join(', ') || ''}
                        onChange={e => setEditorConfig({
                          ...editorConfig,
                          states: e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0)
                        })}
                        className="w-full bg-zinc-800 border border-white/10 rounded-2xl px-6 py-4 font-mono"
                        placeholder="q0, q1, q2, q3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Входной алфавит</label>
                      <input
                        type="text"
                        required
                        value={editorConfig.inputs?.join(', ') || ''}
                        onChange={e => setEditorConfig({
                          ...editorConfig,
                          inputs: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                        className="w-full bg-zinc-800 border border-white/10 rounded-2xl px-6 py-4 font-mono"
                        placeholder="0, 1  или  a, b"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Начальное состояние</label>
                      <input
                        type="text"
                        required
                        value={editorConfig.startState}
                        onChange={e => setEditorConfig({ ...editorConfig, startState: e.target.value.trim() })}
                        className="w-full bg-zinc-800 border border-white/10 rounded-2xl px-6 py-4 font-mono"
                        placeholder="q0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Финальные состояния</label>
                      <input
                        type="text"
                        value={editorConfig.finalStates?.join(', ') || ''}
                        onChange={e => setEditorConfig({
                          ...editorConfig,
                          finalStates: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                        className="w-full bg-zinc-800 border border-white/10 rounded-2xl px-6 py-4 font-mono"
                        placeholder="q2, q3"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Режим токенов</label>
                    <select
                      value={editorConfig.tokenMode}
                      onChange={e => setEditorConfig({ ...editorConfig, tokenMode: e.target.value as 'char' | 'word' })}
                      className="w-full bg-zinc-800 border border-white/10 rounded-2xl px-6 py-4"
                    >
                      <option value="char">По символам (строка)</option>
                      <option value="word">По словам (через пробел)</option>
                    </select>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button
                      type="submit"
                      className="flex-1 py-4 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl font-semibold text-lg hover:brightness-110 transition"
                    >
                      Продолжить → Таблица переходов
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('simulator')}
                      className="px-8 py-4 border border-white/20 rounded-2xl hover:bg-white/5 transition"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="bg-zinc-800/50 border border-white/10 p-6 rounded-2xl mb-8">
                    <h3 className="font-semibold mb-2">Заполните таблицу переходов</h3>
                    <p className="text-slate-400 text-sm">Оставьте поле пустым, если переход невозможен</p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-white/10 mb-10">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-zinc-800">
                          <th className="p-5 text-left">Состояние</th>
                          {editorConfig.inputs?.map(inp => (
                            <th key={inp} className="p-5 text-center">{inp}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {editorConfig.states?.map(state => (
                          <tr key={state}>
                            <td className="p-5 font-mono font-medium">
                              {state}
                              {editorConfig.startState === state && <span className="text-cyan-400"> ★</span>}
                              {editorConfig.finalStates?.includes(state) && <span className="text-emerald-400"> ✓</span>}
                            </td>
                            {editorConfig.inputs?.map(inp => (
                              <td key={inp} className="p-3">
                                <input
                                  type="text"
                                  value={editorConfig.table?.[state]?.[inp] || ''}
                                  onChange={(e) => handleTableChange(state, inp, e.target.value)}
                                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-center font-mono focus:border-violet-500 outline-none"
                                  placeholder="—"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setEditorStep(1)}
                      className="px-10 py-4 border border-white/20 rounded-2xl hover:bg-white/5"
                    >
                      ← Назад
                    </button>
                    <button
                      onClick={saveAutomaton}
                      className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-semibold text-lg transition"
                    >
                      Сохранить автомат и перейти к тестированию
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
