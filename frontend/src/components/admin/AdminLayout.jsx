import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { AdminProvider, useAdmin } from "@/lib/admin-context";
import { AdminThemeProvider } from "@/lib/admin-theme";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import CommandPalette from "./CommandPalette";
import AdminRestricted from "@/pages/admin/AdminRestricted";

function LoadingScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--a-bg)", color: "var(--a-text-muted)" }}
    >
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        <span className="text-sm">Cargando panel…</span>
      </div>
    </div>
  );
}

function AdminShell() {
  const { admin, loading } = useAdmin();
  const loc = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKey(e) {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      } else if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  if (loading) return <LoadingScreen />;
  if (!admin?.is_admin) return <AdminRestricted />;
  if (admin?.must_change_password) return <Navigate to="/cambiar-password-inicial" replace />;

  // breadcrumbs desde ruta
  const parts = loc.pathname.split("/").filter(Boolean);
  const labels = {
    admin: "Admin",
    usuarios: "Usuarios",
    agentes: "Agentes",
    foro: "Foro",
    convocatorias: "Convocatorias",
    recursos: "Recursos",
    espacios: "Espacios",
    analiticas: "Analíticas",
    configuracion: "Configuración",
    actividad: "Actividad",
  };
  const breadcrumbs = parts.map((p, i) => ({
    label: labels[p] || p,
    to: i === parts.length - 1 ? null : "/" + parts.slice(0, i + 1).join("/"),
  }));

  return (
    <div className="min-h-screen flex" style={{ background: "var(--a-bg)" }}>
      <AdminSidebar onOpenPalette={() => setPaletteOpen(true)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminHeader breadcrumbs={breadcrumbs} onOpenPalette={() => setPaletteOpen(true)} />
        <main className="flex-1 p-6 md:p-8 admin-fadein" style={{ color: "var(--a-text)" }}>
          <div className="max-w-[1280px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

export default function AdminLayout() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: "/admin" }} />;
  // Cambio obligatorio de contraseña antes de acceder al panel.
  if (user.must_change_password) return <Navigate to="/cambiar-password-inicial" replace />;
  return (
    <AdminThemeProvider>
      <AdminProvider>
        <AdminShell />
      </AdminProvider>
    </AdminThemeProvider>
  );
}
