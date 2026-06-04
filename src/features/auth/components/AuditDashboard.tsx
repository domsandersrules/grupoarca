"use client";

import React, { useState, useMemo } from "react";
import { useAuthStore, AuditLog } from "../authStore";
import { 
  ShieldAlert, Search, Trash2, Calendar, 
  Filter, AlertTriangle, CheckCircle, Database 
} from "lucide-react";

export default function AuditDashboard() {
  const { logs, limpiarLogs, usuarioActivo } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("todos");
  const [actionFilter, setActionFilter] = useState<string>("todos");

  // Filtrado de logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesModule = moduleFilter === "todos" || log.modulo === moduleFilter;
      const matchesAction = actionFilter === "todos" || log.accion === actionFilter;
      const text = searchTerm.toLowerCase().trim();
      const matchesSearch = !text ||
        log.usuarioNombre.toLowerCase().includes(text) ||
        log.detalles.toLowerCase().includes(text) ||
        log.accion.toLowerCase().includes(text);

      return matchesModule && matchesAction && matchesSearch;
    });
  }, [logs, moduleFilter, actionFilter, searchTerm]);

  // KPIs de auditoría
  const kpis = useMemo(() => {
    let totalLogs = logs.length;
    let eliminaciones = logs.filter(l => l.accion === "eliminar").length;
    let usuariosUnicos = new Set(logs.map(l => l.usuarioId)).size;

    return {
      totalLogs,
      eliminaciones,
      usuariosUnicos
    };
  }, [logs]);

  // Manejar limpieza
  const handleClear = () => {
    if (confirm("¿Estás seguro de que deseas vaciar por completo la bitácora de movimientos? Esta acción no se puede deshacer.")) {
      limpiarLogs();
    }
  };

  // Helper para pintar badges de módulo
  const getModuloBadge = (modulo: AuditLog["modulo"]) => {
    switch (modulo) {
      case "auth":
        return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-400 border-slate-200 dark:border-slate-800";
      case "crm":
        return "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400 border-sky-200 dark:border-sky-800";
      case "quotes":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800";
      case "nesting":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800";
      default:
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800";
    }
  };

  // Helper para pintar badges de acción
  const getAccionBadge = (accion: AuditLog["accion"]) => {
    switch (accion) {
      case "crear":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "modificar":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "eliminar":
        return "bg-red-500/10 text-red-600 dark:text-red-400 font-bold border border-red-500/20";
      case "estatus":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  return (
    <div className="w-full max-w-[95vw] 2xl:max-w-[1500px] mx-auto p-4 md:p-8 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            Bitácora de Auditoría & Logs
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Registro cronológico detallado de todos los movimientos de usuarios y acciones del sistema.
          </p>
        </div>

        {usuarioActivo.rol === "admin" && logs.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm shadow-red-500/10 text-sm align-self-start"
          >
            <Trash2 className="w-4 h-4" />
            Vaciar Bitácora
          </button>
        )}
      </div>

      {/* KPIS DE BITÁCORA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Total de Movimientos</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-white mt-1">
              {kpis.totalLogs}
            </p>
          </div>
          <Database className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
        </div>
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Acciones Críticas (Eliminar)</p>
            <p className="text-3xl font-black text-red-600 dark:text-red-500 mt-1">
              {kpis.eliminaciones}
            </p>
          </div>
          <AlertTriangle className="w-10 h-10 text-red-200 dark:text-red-950/40" />
        </div>
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Usuarios Interactuando</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500 mt-1">
              {kpis.usuariosUnicos}
            </p>
          </div>
          <CheckCircle className="w-10 h-10 text-emerald-400 dark:text-emerald-950/40" />
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por usuario, detalles, acción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none"
          />
        </div>

        <div className="md:col-span-3 flex bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Filter className="w-4 h-4 text-zinc-400 self-center ml-2 mr-1" />
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-transparent text-xs font-bold text-zinc-700 dark:text-zinc-300 w-full focus:outline-none cursor-pointer"
          >
            <option value="todos" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Filtrar por Módulo: Todos</option>
            <option value="auth" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Sesión & Accesos</option>
            <option value="crm" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">CRM & Clientes</option>
            <option value="quotes" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Cotizaciones</option>
            <option value="nesting" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Simulador Nesting</option>
          </select>
        </div>

        <div className="md:col-span-3 flex bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Filter className="w-4 h-4 text-zinc-400 self-center ml-2 mr-1" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-transparent text-xs font-bold text-zinc-700 dark:text-zinc-300 w-full focus:outline-none cursor-pointer"
          >
            <option value="todos" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Filtrar por Acción: Todas</option>
            <option value="crear" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Crear (Alta)</option>
            <option value="modificar" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Modificar (Edición)</option>
            <option value="eliminar" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Eliminar (Baja)</option>
            <option value="estatus" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Estatus (Aprobación)</option>
            <option value="login" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Sesión (Simulación)</option>
          </select>
        </div>
      </div>

      {/* TABLA DE MOVIMIENTOS */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-950">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Módulo</th>
                <th className="px-6 py-4">Acción</th>
                <th className="px-6 py-4">Descripción de Movimiento</th>
                <th className="px-6 py-4 text-right">Fecha & Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-zinc-400 font-medium">
                    No se encontraron registros de movimientos en la bitácora.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      {log.usuarioNombre}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 uppercase">
                        {log.usuarioRol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black capitalize border ${getModuloBadge(log.modulo)}`}>
                        {log.modulo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold capitalize ${getAccionBadge(log.accion)}`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 max-w-md break-words">
                      {log.detalles}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-zinc-400 font-medium">
                      {new Date(log.createdAt).toLocaleString("es-MX", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
