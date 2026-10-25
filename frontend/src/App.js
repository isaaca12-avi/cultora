import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

import AppLayout from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import Vision from "@/pages/Vision";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import RecuperarPassword from "@/pages/RecuperarPassword";
import RestablecerPassword from "@/pages/RestablecerPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import Dashboard from "@/pages/Dashboard";
import GoalsPage from "@/pages/Goals";
import Diagnostic from "@/pages/Diagnostic";
import PlanView from "@/pages/PlanView";
import PlansList from "@/pages/PlansList";
import Knowledge from "@/pages/Knowledge";
import KnowledgeDoc from "@/pages/KnowledgeDoc";
import ProfilePage from "@/pages/Profile";
import AgentsList from "@/pages/AgentsList";
import AgentProfile from "@/pages/AgentProfile";
import MyAgentProfile from "@/pages/MyAgentProfile";
import Support from "@/pages/Support";
import ForumHome from "@/pages/ForumHome";
import ForumNew from "@/pages/ForumNew";
import ForumTopic from "@/pages/ForumTopic";
import Convocatorias from "@/pages/Convocatorias";
import ConvocatoriaDetail from "@/pages/ConvocatoriaDetail";

import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminAgents from "@/pages/admin/AdminAgents";
import AdminForum from "@/pages/admin/AdminForum";
import AdminConvocatorias from "@/pages/admin/AdminConvocatorias";
import AdminResources from "@/pages/admin/AdminResources";
import AdminSpaces from "@/pages/admin/AdminSpaces";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminConfig from "@/pages/admin/AdminConfig";
import AdminRoles from "@/pages/admin/AdminRoles";
import AdminActivity from "@/pages/admin/AdminActivity";
import AdminMotorHub from "@/pages/admin/AdminMotorHub";
import AdminMotorBiblioteca from "@/pages/admin/AdminMotorBiblioteca";
import AdminMotorReglas from "@/pages/admin/AdminMotorReglas";
import AdminMotorSimulador from "@/pages/admin/AdminMotorSimulador";
import AdminProfile from "@/pages/admin/AdminProfile";
import InitialPasswordChange from "@/pages/InitialPasswordChange";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center font-serif-display text-3xl text-obsidian/40">Cargando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  // Cambio obligatorio de contraseña: gatea todo el frontend hasta cumplirlo.
  if (user.must_change_password) return <Navigate to="/cambiar-password-inicial" replace />;
  // Los admins no consumen el producto público — se van directo al panel.
  if (user.is_admin || user.admin_role) return <Navigate to="/admin" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    // Cambio de contraseña inicial obligatorio.
    if (user.must_change_password) return <Navigate to="/cambiar-password-inicial" replace />;
    // Admin va directo al panel; usuarios comunes al dashboard/perfil según completitud.
    if (user.is_admin || user.admin_role) return <Navigate to="/admin" replace />;
    return <Navigate to={user.profile_complete ? "/dashboard" : "/perfil"} replace />;
  }
  return children;
}

export default function App() {
  return (
    <div className="App noise-overlay">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/vision" element={<Vision />} />
            <Route path="/apoyar" element={<Support />} />
            <Route path="/convocatorias" element={<AppLayout />}>
              <Route index element={<Convocatorias />} />
            </Route>
            <Route path="/convocatorias/:convId" element={<AppLayout />}>
              <Route index element={<ConvocatoriaDetail />} />
            </Route>
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/registro" element={<PublicOnly><RegisterPage /></PublicOnly>} />
            <Route path="/recuperar-password" element={<RecuperarPassword />} />
            <Route path="/restablecer-password" element={<RestablecerPassword />} />
            <Route path="/verificar-email" element={<VerifyEmail />} />
            <Route path="/cambiar-password-inicial" element={<InitialPasswordChange />} />

            <Route element={<Protected><AppLayout /></Protected>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/objetivos" element={<GoalsPage />} />
              <Route path="/diagnostico/:sessionId" element={<Diagnostic />} />
              <Route path="/planes" element={<PlansList />} />
              <Route path="/plan/:planId" element={<PlanView />} />
              <Route path="/conocimiento" element={<Knowledge />} />
              <Route path="/conocimiento/:docId" element={<KnowledgeDoc />} />
              <Route path="/agentes" element={<AgentsList />} />
              <Route path="/agentes/mi-perfil" element={<MyAgentProfile />} />
              <Route path="/agentes/:agentId" element={<AgentProfile />} />
              <Route path="/foro" element={<ForumHome />} />
              <Route path="/foro/nuevo" element={<ForumNew />} />
              <Route path="/foro/tema/:topicId" element={<ForumTopic />} />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="usuarios" element={<AdminUsers />} />
              <Route path="agentes" element={<AdminAgents />} />
              <Route path="foro" element={<AdminForum />} />
              <Route path="convocatorias" element={<AdminConvocatorias />} />
              <Route path="recursos" element={<AdminResources />} />
              <Route path="espacios" element={<AdminSpaces />} />
              <Route path="analiticas" element={<AdminAnalytics />} />
              <Route path="configuracion" element={<AdminConfig />} />
              <Route path="configuracion/roles" element={<AdminRoles />} />
              <Route path="motor" element={<AdminMotorHub />} />
              <Route path="motor/biblioteca" element={<AdminMotorBiblioteca />} />
              <Route path="motor/reglas" element={<AdminMotorReglas />} />
              <Route path="motor/simulador" element={<AdminMotorSimulador />} />
              <Route path="perfil" element={<AdminProfile />} />
              <Route path="actividad" element={<AdminActivity />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </AuthProvider>
    </div>
  );
}
