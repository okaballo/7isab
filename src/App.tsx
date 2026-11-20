import { createContext, useCallback, useContext, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useBudget, useSettings } from './db/hooks';
import { todayISO } from './lib/period';
import type { Expense } from './lib/types';
import { BottomNav } from './components/BottomNav';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { AddExpense } from './screens/AddExpense';
import { EnvelopeDetail } from './screens/EnvelopeDetail';
import { History } from './screens/History';
import { Debts } from './screens/Debts';
import { Insights } from './screens/Insights';
import { Settings } from './screens/Settings';
import { EditPlan } from './screens/EditPlan';
import { NewPeriod } from './screens/NewPeriod';

/** Opens the Add expense sheet from anywhere (optionally preselecting an envelope or editing an expense). */
type OpenAdd = (o?: { envelopeId?: number; expense?: Expense }) => void;
const AddCtx = createContext<OpenAdd>(() => {});
export const useOpenAddExpense = () => useContext(AddCtx);

export default function App() {
  const settings = useSettings();
  const budget = useBudget();
  const [add, setAdd] = useState<{ envelopeId?: number; expense?: Expense } | null>(null);
  const openAdd = useCallback<OpenAdd>((o) => setAdd(o ?? {}), []);
  const close = useCallback(() => setAdd(null), []);

  if (settings === undefined || budget === undefined) return null; // IndexedDB still loading
  if (!settings?.onboarded || !budget) return <Onboarding />;
  if (todayISO() > budget.period.endDate) return <NewPeriod budget={budget} />;

  return (
    <HashRouter>
      <AddCtx.Provider value={openAdd}>
        <Routes>
          <Route path="/" element={<Home budget={budget} />} />
          <Route path="/history" element={<History budget={budget} />} />
          <Route path="/insights" element={<Insights budget={budget} />} />
          <Route path="/debts" element={<Debts budget={budget} />} />
          <Route path="/settings" element={<Settings budget={budget} />} />
          <Route path="/plan" element={<EditPlan budget={budget} />} />
          <Route path="/envelope/:id" element={<EnvelopeDetail budget={budget} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
        {add && <AddExpense budget={budget} initial={add} onClose={close} />}
      </AddCtx.Provider>
    </HashRouter>
  );
}
