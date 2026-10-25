import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Error de render en Cultora:", error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-alabaster px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-obsidian/10 bg-white p-8 shadow-lift">
          <div className="font-mono-meta text-terracotta">Algo salió mal</div>
          <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight tracking-tight text-obsidian">
            Esta vista no pudo cargarse
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-obsidian/55">
            Ocurrió un error inesperado al mostrar la página. Recarga para volver a intentarlo; si
            persiste, revisa la conexión con el servidor.
          </p>
          {process.env.NODE_ENV === "development" && error?.message ? (
            <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-linen/70 p-3 text-[11px] text-obsidian/60">
              {error.message}
            </pre>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-9 rounded-lg bg-obsidian px-4 text-[13px] font-medium text-alabaster transition-colors hover:bg-obsidian/90"
            >
              Recargar página
            </button>
            <a
              href="/"
              className="inline-flex h-9 items-center rounded-lg border border-obsidian/15 bg-white px-4 text-[13px] font-medium text-obsidian/70 transition-colors hover:border-obsidian/30 hover:text-obsidian"
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    );
  }
}
