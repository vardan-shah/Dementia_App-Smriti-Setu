import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Landing } from './pages/Landing';
import { RoleSelect } from './pages/RoleSelect';
import { Login } from './pages/caregiver/Login';
import { Register } from './pages/caregiver/Register';
import { Dashboard } from './pages/caregiver/Dashboard';
import { CreateElder } from './pages/caregiver/CreateElder';
import { PairElder } from './pages/caregiver/PairElder';
import { MemoryVault } from './pages/caregiver/MemoryVault';
import { CreateRelative } from './pages/caregiver/CreateRelative';
import { Pairing as ElderPairing } from './pages/elder/Pairing';
import { Home as ElderHome } from './pages/elder/Home';
import { Today as ElderToday } from './pages/elder/Today';
import { Games as ElderGames } from './pages/elder/Games';
import { ObjectRecognition } from './pages/elder/games/ObjectRecognition';
import { Memories as ElderMemories } from './pages/elder/Memories';
import { Help as ElderHelp } from './pages/elder/Help';

import { CaregiverShell } from './components/layout/CaregiverShell';
import { ElderShell } from './components/layout/ElderShell';
import { RoleGuard } from './components/layout/RoleGuard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/role-select" element={<RoleSelect />} />
          <Route path="/caregiver/login" element={<Login />} />
          <Route path="/caregiver/register" element={<Register />} />
          <Route path="/elder/pair" element={<ElderPairing />} />

          {/* Protected Caregiver Routes */}
          <Route path="/caregiver" element={
            <RoleGuard allowedRole="CAREGIVER">
              <CaregiverShell />
            </RoleGuard>
          }>
            <Route index element={<Dashboard />} />
            <Route path="create-elder" element={<CreateElder />} />
            <Route path="elders" element={<Dashboard />} />
            <Route path="elders/:id/pair" element={<PairElder />} />
            <Route path="elders/:id/vault" element={<MemoryVault />} />
            <Route path="elders/:id/vault/relative/new" element={<CreateRelative />} />
          </Route>

          {/* Protected Elder Routes */}
          <Route path="/elder" element={
            <RoleGuard allowedRole="ELDER">
              <ElderShell />
            </RoleGuard>
          }>
            <Route index element={<ElderHome />} />
            <Route path="today" element={<ElderToday />} />
            <Route path="games" element={<ElderGames />} />
            <Route path="games/object-recognition" element={<ObjectRecognition />} />
            <Route path="memories" element={<ElderMemories />} />
            <Route path="help" element={<ElderHelp />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
