import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useAdmin } from "@/lib/admin-context";
import { useAdminTheme } from "@/lib/admin-theme";
import { Sun, Moon, SignOut, CaretDown } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import NotificationsBell from "./NotificationsBell";

export default function AdminHeader({ breadcrumbs }) {
  const { logout } = useAuth();
  const { admin } = useAdmin();
  const { theme, toggle } = useAdminTheme();
  const nav = useNavigate();

  return (
    <header
      className="sticky top-0 z-20 h-14 flex items-center justify-between px-6"
      style={{ background: "color-mix(in oklab, var(--a-bg) 88%, transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--a-border)" }}
      data-testid="admin-header"
    >
      <nav className="flex items-center gap-2 text-[13px] min-w-0">
        {(breadcrumbs || []).map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <span className="admin-text-faint">/</span> : null}
            {b.to ? (
              <button
                className="admin-text-muted hover:opacity-80 transition-opacity truncate"
                onClick={() => nav(b.to)}
              >
                {b.label}
              </button>
            ) : (
              <span className="font-medium truncate" style={{ color: "var(--a-text)" }}>{b.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className="flex items-center gap-1.5">
        <NotificationsBell />
        <button
          onClick={toggle}
          className="admin-btn admin-btn-icon admin-btn-ghost"
          aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          data-testid="admin-theme-toggle"
        >
          {theme === "dark" ? <Sun size={15} weight="regular" /> : <Moon size={15} weight="regular" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="admin-btn admin-btn-ghost h-8" data-testid="admin-user-menu">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-semibold"
                style={{ background: "var(--a-surface-2)", color: "var(--a-text)" }}
              >
                {(admin?.name || "?")[0]?.toUpperCase()}
              </div>
              <CaretDown size={11} weight="bold" style={{ color: "var(--a-text-muted)" }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[220px] p-1 shadow-lg"
            style={{ background: "var(--a-surface)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}
          >
            <DropdownMenuLabel className="px-2.5 py-2">
              <div className="text-[13px] font-medium">{admin?.name}</div>
              <div className="text-[11px] admin-text-muted mt-0.5">{admin?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator style={{ background: "var(--a-border)" }} />
            <DropdownMenuItem
              className="text-[12.5px] focus:bg-transparent"
              style={{ color: "var(--a-text)" }}
              onClick={() => window.open("/", "_blank", "noopener,noreferrer")}
              data-testid="admin-menu-view-site"
            >
              Ver sitio público
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[12.5px] focus:bg-transparent"
              style={{ color: "var(--a-text)" }}
              onClick={() => nav("/admin/perfil")}
              data-testid="admin-menu-profile"
            >
              Mi cuenta
            </DropdownMenuItem>
            <DropdownMenuSeparator style={{ background: "var(--a-border)" }} />
            <DropdownMenuItem
              className="text-[12.5px] focus:bg-transparent"
              style={{ color: "var(--a-danger)" }}
              onClick={() => { logout(); nav("/"); }}
              data-testid="admin-logout"
            >
              <SignOut size={13} className="mr-2" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
