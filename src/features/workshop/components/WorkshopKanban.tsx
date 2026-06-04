import React, { useState } from "react";
import { useWorkshopStore, OrdenTaller } from "../workshopStore";
import { useAuthStore } from "../../auth/authStore";
import { useConfigStore } from "@/features/config/configStore";
import { 
  ClipboardList, Play, Pause, CheckCircle2, 
  AlertTriangle, Save, Loader2, Info, Calculator,
  Printer, X, Landmark, FileText
} from "lucide-react";

export default function WorkshopKanban() {
  const { ordenesTaller, actualizarEstatusOrden, registrarConsumosReales } = useWorkshopStore();
  const { usuarioActivo, registrarActividad } = useAuthStore();
  const { empresa, sucursalActivaId } = useConfigStore();
  
  // State para el modal de consumos reales y ficha técnica
  const [selectedOrden, setSelectedOrden] = useState<OrdenTaller | null>(null);
  const [viewingFichaOrden, setViewingFichaOrden] = useState<OrdenTaller | null>(null);
  const [consumosInputs, setConsumosInputs] = useState<{ [materialId: string]: number }>({});
  
  const esTallerOAdmin = usuarioActivo.rol === "taller" || usuarioActivo.rol === "admin";
  const esLectura = !esTallerOAdmin;

  // Clasificación de órdenes por estado
  const columnas: {
    id: OrdenTaller["estado"];
    titulo: string;
    headerCls: string;
    cardAccent: string;
    badgeCls: string;
    icon: any;
    countBg: string;
  }[] = [
    {
      id: "pendiente",
      titulo: "Cola de Espera",
      headerCls: "bg-zinc-100 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800",
      cardAccent: "border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500",
      badgeCls: "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
      countBg: "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
      icon: ClipboardList,
    },
    {
      id: "en_produccion",
      titulo: "En Producción",
      headerCls: "bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40",
      cardAccent: "border-amber-200 dark:border-amber-900/50 hover:border-amber-400 dark:hover:border-amber-600",
      badgeCls: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
      countBg: "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400",
      icon: Loader2,
    },
    {
      id: "detenido",
      titulo: "Detenido / Pausado",
      headerCls: "bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-900/40",
      cardAccent: "border-red-200 dark:border-red-900/50 hover:border-red-400 dark:hover:border-red-600",
      badgeCls: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300",
      countBg: "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400",
      icon: AlertTriangle,
    },
    {
      id: "terminado",
      titulo: "Terminado ✓",
      headerCls: "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40",
      cardAccent: "border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400 dark:hover:border-emerald-600",
      badgeCls: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
      countBg: "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle2,
    },
  ];

  const handleOpenConsumos = (orden: OrdenTaller) => {
    setSelectedOrden(orden);
    const initialInputs: { [materialId: string]: number } = {};
    orden.materialesEstimados.forEach((m) => {
      initialInputs[m.materialId] = m.cantidadReal ?? m.cantidadEstimada;
    });
    setConsumosInputs(initialInputs);
  };

  const handleSaveConsumos = () => {
    if (!selectedOrden) return;
    const consumos = Object.entries(consumosInputs).map(([materialId, cantidadReal]) => ({
      materialId,
      cantidadReal: Number(cantidadReal)
    }));
    registrarConsumosReales(selectedOrden.id, consumos);
    setSelectedOrden(null);
  };

  const getPriorityColor = (prioridad: OrdenTaller["prioridad"]) => {
    switch (prioridad) {
      case "alta": return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
      case "media": return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
      case "baja": return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-8 max-w-[95vw] 2xl:max-w-[1500px] mx-auto pb-10">
      <div className="no-print space-y-6">

      {/* ═══════════════════════════════════════════════════
          HERO BANNER — TALLER & PRODUCCIÓN
      ═══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 border border-zinc-700/50 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 15% 50%, #f59e0b 0%, transparent 50%), radial-gradient(circle at 85% 20%, #f97316 0%, transparent 40%)" }} />
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full -translate-y-24 translate-x-24 blur-3xl" />

        <div className="relative p-6 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Título */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-lg shadow-amber-500/25">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
                  Módulo Taller
                </span>
              </div>
              <h1 className="text-2xl font-black text-white leading-tight">
                Órdenes de <span className="text-amber-400">Producción</span>
              </h1>
              <p className="text-zinc-400 text-sm max-w-lg">
                Gestión de fabricación de canceles, domos y herrería. Control de mermas e insumos en taller.
              </p>
            </div>

            {/* KPI Pills de estados del kanban */}
            <div className="flex flex-wrap gap-3">
              {[
                {
                  label: "Cola",
                  val: ordenesTaller.filter(o => o.estado === "pendiente" && (sucursalActivaId === "todos" || o.sucursalId === sucursalActivaId)).length,
                  color: "text-zinc-300", bg: "bg-white/10 border-white/15",
                },
                {
                  label: "En Corte",
                  val: ordenesTaller.filter(o => o.estado === "en_produccion" && (sucursalActivaId === "todos" || o.sucursalId === sucursalActivaId)).length,
                  color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20",
                },
                {
                  label: "Pausadas",
                  val: ordenesTaller.filter(o => o.estado === "detenido" && (sucursalActivaId === "todos" || o.sucursalId === sucursalActivaId)).length,
                  color: "text-red-400", bg: "bg-red-400/10 border-red-400/20",
                },
                {
                  label: "Terminadas",
                  val: ordenesTaller.filter(o => o.estado === "terminado" && (sucursalActivaId === "todos" || o.sucursalId === sucursalActivaId)).length,
                  color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20",
                },
              ].map((kpi) => (
                <div key={kpi.label} className={`flex flex-col items-center px-4 py-3 rounded-xl border ${kpi.bg} min-w-[72px]`}>
                  <p className={`text-xl font-black font-mono ${kpi.color}`}>{kpi.val}</p>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider mt-0.5 text-center">{kpi.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Aviso modo lectura */}
          {esLectura && (
            <div className="mt-5 pt-5 border-t border-white/10 flex items-center gap-3 text-xs">
              <div className="p-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <Info className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-zinc-400">
                <span className="font-black text-blue-400">Modo Vista:</span>{" "}
                Solo los usuarios de <span className="font-black text-white">Taller</span> o <span className="font-black text-white">Administradores</span> pueden modificar estados o registrar insumos.
              </p>
            </div>
          )}
        </div>
      </div>


      {/* REJILLA KANBAN */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {columnas.map((col) => {
          const ordenesCol = ordenesTaller.filter((o) => 
            o.estado === col.id && 
            (sucursalActivaId === "todos" || o.sucursalId === sucursalActivaId)
          );
          const ColIcon = col.icon;

          return (
            <div
              key={col.id}
              className={`rounded-2xl border p-4 flex flex-col space-y-4 min-h-[500px] ${col.headerCls}`}
            >
              {/* Header Columna */}
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-200/60 dark:border-zinc-700/50">
                <div className="flex items-center gap-2">
                  <ColIcon className={`w-4 h-4 ${col.id === "en_produccion" ? "animate-spin text-amber-500" : col.id === "terminado" ? "text-emerald-600" : col.id === "detenido" ? "text-red-500" : "text-zinc-500"}`} />
                  <span className="font-black text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
                    {col.titulo}
                  </span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${col.countBg}`}>
                  {ordenesCol.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[600px]">
                {ordenesCol.length === 0 ? (
                  <div className="h-28 flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl text-center text-[11px] text-zinc-400 dark:text-zinc-600 p-4 font-bold">
                    Sin órdenes en este estado
                  </div>
                ) : (
                  ordenesCol.map((orden) => (
                    <div
                      key={orden.id}
                      className={`relative bg-white dark:bg-zinc-900 border shadow-sm hover:shadow-md transition-all duration-200 space-y-3 p-4 rounded-xl overflow-hidden cursor-default ${col.cardAccent}`}
                    >
                      {/* Acento de color superior */}
                      <div className={`absolute top-0 left-0 right-0 h-0.5 ${
                        col.id === "en_produccion" ? "bg-amber-400" :
                        col.id === "detenido" ? "bg-red-400" :
                        col.id === "terminado" ? "bg-emerald-400" : "bg-zinc-300 dark:bg-zinc-600"
                      }`} />
                      {/* Folio y Prioridad */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {orden.folio}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingFichaOrden(orden)}
                            title="Ver Ficha Técnica / OT de Fabricación"
                            className="p-1 text-zinc-400 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors focus:outline-none"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getPriorityColor(orden.prioridad)}`}>
                            {orden.prioridad}
                          </span>
                        </div>
                      </div>

                      {/* Cliente y Vínculo de Cotización */}
                      <div>
                        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {orden.clienteNombre}
                        </h3>
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                          Cotización: {orden.folioCotizacion}
                        </p>
                      </div>

                      {/* Conceptos / Piezas */}
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50 space-y-1">
                        <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Piezas a Fabricar</p>
                        {orden.conceptos.map((c) => (
                          <div key={c.id} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            • {c.cantidad}x {c.descripcion} ({c.ancho}x{c.alto} mm)
                          </div>
                        ))}
                      </div>

                      {/* Materiales Estimados / Merma */}
                      {orden.materialesEstimados.length > 0 && (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-0.5">
                          <p className="font-bold text-zinc-700 dark:text-zinc-300">Material Estimado (Nesting):</p>
                          {orden.materialesEstimados.map((m) => (
                            <div key={m.materialId} className="flex justify-between font-mono">
                              <span>{m.codigo}</span>
                              <span className="font-bold">
                                {m.cantidadEstimada} {m.unidadMedida}{m.cantidadEstimada > 1 ? "s" : ""}
                              </span>
                            </div>
                          ))}
                          
                          {/* Mostrar desvíos reales si ya fueron cargados */}
                          {orden.materialesEstimados.some(m => m.cantidadReal !== undefined) && (
                            <div className="mt-1 border-t border-zinc-100 dark:border-zinc-800 pt-1 space-y-0.5">
                              <p className="font-bold text-zinc-700 dark:text-zinc-300">Consumo Real Registrado:</p>
                              {orden.materialesEstimados.map((m) => {
                                if (m.cantidadReal === undefined) return null;
                                const diff = m.cantidadReal - m.cantidadEstimada;
                                return (
                                  <div key={m.materialId} className="flex justify-between font-mono text-[10px]">
                                    <span>{m.codigo}</span>
                                    <span className={diff > 0 ? "text-red-500 font-bold" : diff < 0 ? "text-emerald-500 font-bold" : "text-zinc-500"}>
                                      {m.cantidadReal} {m.unidadMedida} ({diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : "0"})
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Fecha de Compromiso */}
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex justify-between font-semibold">
                        <span>Compromiso:</span>
                        <span>{new Date(orden.fechaCompromiso || "").toLocaleDateString("es-MX", { day: '2-digit', month: 'short' })}</span>
                      </div>

                      {/* ACCIONES KANBAN */}
                      {!esLectura && (
                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
                          
                          {/* Pendiente -> En Producción */}
                          {orden.estado === "pendiente" && (
                            <button
                              onClick={() => actualizarEstatusOrden(orden.id, "en_produccion")}
                              className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 rounded-lg text-xs transition-colors shadow-sm"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Iniciar Fab.
                            </button>
                          )}

                          {/* En Producción -> Pausa / Consumos / Terminar */}
                          {orden.estado === "en_produccion" && (
                            <div className="w-full space-y-1.5">
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => actualizarEstatusOrden(orden.id, "detenido")}
                                  className="flex-1 flex items-center justify-center gap-1 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400 font-bold py-1.5 rounded-lg text-[10px] transition-colors"
                                >
                                  <Pause className="w-3 h-3" />
                                  Pausar
                                </button>
                                <button
                                  onClick={() => handleOpenConsumos(orden)}
                                  className="flex-1 flex items-center justify-center gap-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-bold py-1.5 rounded-lg text-[10px] transition-colors"
                                >
                                  <Calculator className="w-3 h-3" />
                                  Insumos
                                </button>
                              </div>
                              <button
                                onClick={() => actualizarEstatusOrden(orden.id, "terminado")}
                                className="w-full flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Terminar & Enviar Logística
                              </button>
                            </div>
                          )}

                          {/* Detenido -> Reanudar */}
                          {orden.estado === "detenido" && (
                            <button
                              onClick={() => actualizarEstatusOrden(orden.id, "en_produccion")}
                              className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 rounded-lg text-xs transition-colors shadow-sm"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Reanudar
                            </button>
                          )}

                          {/* Terminado */}
                          {orden.estado === "terminado" && (
                            <span className="w-full text-center py-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-wider rounded-lg border border-emerald-200 dark:border-emerald-900/40">
                              Terminado ✓
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DE REGISTRO DE INSUMOS REALES */}
      {selectedOrden && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Cabecera Modal */}
            <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-zinc-950 dark:text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  Cierre de Materiales de Producción
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Orden {selectedOrden.folio} - {selectedOrden.clienteNombre}
                </p>
              </div>
              <button 
                onClick={() => setSelectedOrden(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Listado de Insumos */}
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Registra la cantidad física real de materiales que el operario utilizó en el taller. Compara contra lo estimado por el nesting de corte para documentar mermas:
              </p>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="p-3">Material</th>
                      <th className="p-3 text-center">Estimado</th>
                      <th className="p-3 text-center w-28">Consumo Real</th>
                      <th className="p-3 text-right">Variación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrden.materialesEstimados.map((m) => {
                      const real = consumosInputs[m.materialId] ?? m.cantidadEstimada;
                      const diff = real - m.cantidadEstimada;
                      return (
                        <tr key={m.materialId} className="border-b border-zinc-200 dark:border-zinc-800/55 text-zinc-800 dark:text-zinc-200">
                          <td className="p-3 font-semibold">
                            <div>{m.codigo}</div>
                            <div className="text-[10px] text-zinc-400 font-medium">{m.descripcion}</div>
                          </td>
                          <td className="p-3 text-center font-bold font-mono">
                            {m.cantidadEstimada} {m.unidadMedida}(s)
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={real}
                              onChange={(e) => setConsumosInputs({
                                ...consumosInputs,
                                [m.materialId]: Number(e.target.value)
                              })}
                              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded font-bold font-mono text-center focus:outline-none focus:border-emerald-600 text-zinc-950 dark:text-white"
                            />
                          </td>
                          <td className="p-3 text-right font-bold font-mono">
                            {diff > 0 ? (
                              <span className="text-red-500 bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded text-[10px]">
                                +{diff} Merma
                              </span>
                            ) : diff < 0 ? (
                              <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded text-[10px]">
                                {diff} Ahorro
                              </span>
                            ) : (
                              <span className="text-zinc-400 font-medium">Exacto</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Acciones Modal */}
            <div className="flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <button
                onClick={() => setSelectedOrden(null)}
                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConsumos}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar Consumos
              </button>
            </div>

          </div>
        </div>
      )}

      </div>

      {/* MODAL DETALLADO DE FICHA TÉCNICA / ORDEN DE TRABAJO (OT) */}
      {viewingFichaOrden && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div id="print-ficha-ot" className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <style>{`
              @media print {
                /* Ocultar elementos marcados para no imprimirse */
                .no-print {
                  display: none !important;
                }
                
                /* Resetear html y body para evitar que el scroll o altura del fondo genere paginado extra */
                html, body {
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background-color: white !important;
                }
                
                /* Desactivar posicionamiento fijo del contenedor del modal en modo print */
                .fixed.inset-0.z-50 {
                  position: absolute !important;
                  display: block !important;
                  overflow: visible !important;
                  background: transparent !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }

                /* Ajustar la tarjeta de la ficha técnica al ancho del papel */
                #print-ficha-ot {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 !important;
                  padding: 10px !important;
                  box-shadow: none !important;
                  border: none !important;
                  background-color: white !important;
                  color: black !important;
                  max-height: none !important;
                  overflow: visible !important;
                  display: block !important;
                }
                
                /* Asegurar visibilidad de elementos internos e impresión de fondos */
                #print-ficha-ot * {
                  visibility: visible !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                
                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  page-break-inside: auto;
                }
                tr {
                  page-break-inside: avoid;
                  page-break-after: auto;
                }
                thead {
                  display: table-header-group;
                }
                th, td {
                  border: 1px solid #e4e4e7 !important;
                  padding: 8px !important;
                }
              }
            `}</style>
            
            {/* Cabecera de Ficha con Logo y Datos de la Empresa */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-5">
              <div className="flex items-center gap-4">
                {empresa.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={empresa.logoUrl} alt="Logo" className="w-20 h-20 object-contain rounded-2xl bg-zinc-50 dark:bg-zinc-950 p-2.5 border border-zinc-200/65 dark:border-zinc-800 shadow-inner" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 border border-zinc-200 dark:border-zinc-800">
                    GA
                  </div>
                )}
                <div className="text-left space-y-0.5">
                  <h2 className="text-md font-black text-zinc-900 dark:text-white uppercase tracking-wider">{empresa.nombreComercial}</h2>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">{empresa.razonSocial}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider">RFC: {empresa.rfc}</p>
                  <p className="text-[9px] text-zinc-500 dark:text-zinc-400 leading-tight">
                    {empresa.calle} {empresa.numero}, Col. {empresa.colonia}, {empresa.municipio}, {empresa.estado}, C.P. {empresa.codigoPostal}
                  </p>
                </div>
              </div>
              
              <div className="text-center md:text-right space-y-1">
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-200/50">
                  <ClipboardList className="w-3.5 h-3.5" />
                  Orden de Trabajo
                </div>
                <h3 className="text-xl font-black text-zinc-900 dark:text-white mt-1">OT: {viewingFichaOrden.folio}</h3>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold">Ref Cotización: {viewingFichaOrden.folioCotizacion}</p>
              </div>
            </div>

            {/* Ficha Informativa General */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="space-y-1 text-left">
                <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Cliente & Obra</span>
                <p className="font-bold text-zinc-800 dark:text-zinc-100">{viewingFichaOrden.clienteNombre}</p>
                <p className="text-zinc-500 leading-normal">Instalación en sitio / Obra de cancelería</p>
              </div>
              <div className="space-y-1 text-left">
                <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Fechas de Control</span>
                <p className="font-semibold text-zinc-600 dark:text-zinc-300 text-[11px]">
                  Recepción: <span className="font-bold text-zinc-800 dark:text-zinc-100">{new Date(viewingFichaOrden.fechaRecepcion || viewingFichaOrden.createdAt).toLocaleDateString("es-MX", { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </p>
                <p className="font-semibold text-zinc-600 dark:text-zinc-300 text-[11px]">
                  Compromiso: <span className="font-bold text-zinc-800 dark:text-zinc-100">{new Date(viewingFichaOrden.fechaCompromiso || "").toLocaleDateString("es-MX", { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </p>
                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Prioridad: <span className="font-black uppercase text-amber-600">{viewingFichaOrden.prioridad}</span></p>
              </div>
              <div className="space-y-1 text-left">
                <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Responsabilidad de Taller</span>
                <p className="font-bold text-zinc-800 dark:text-zinc-100">Área de Corte y Ensamble</p>
                <p className="text-zinc-500 leading-normal">Supervisor: {usuarioActivo.nombre}</p>
              </div>
            </div>

            {/* Listado de Piezas a Fabricar */}
            <div className="space-y-2 text-left">
              <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Conceptos a Fabricar en Taller</h4>
              
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[9px]">
                      <th className="p-3">Cant.</th>
                      <th className="p-3">Descripción del Elemento</th>
                      <th className="p-3 text-center">Especialidad</th>
                      <th className="p-3 text-center">Ancho (mm)</th>
                      <th className="p-3 text-center">Alto (mm)</th>
                      <th className="p-3 text-center">Área Unit. (m²)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-zinc-800 dark:text-zinc-200">
                    {viewingFichaOrden.conceptos.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                        <td className="p-3 font-bold text-center w-12">{c.cantidad}</td>
                        <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">{c.descripcion}</td>
                        <td className="p-3 text-center uppercase text-[10px] font-black text-emerald-600">{c.tipoTrabajo}</td>
                        <td className="p-3 text-center font-mono font-bold">{c.ancho}</td>
                        <td className="p-3 text-center font-mono font-bold">{c.alto}</td>
                        <td className="p-3 text-center font-mono">{((c.ancho * c.alto) / 1000000).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Listado de Materiales e Insumos */}
            {viewingFichaOrden.materialesEstimados.length > 0 && (
              <div className="space-y-2 text-left">
                <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Habilitación de Insumos & Nesting lineal</h4>
                
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[9px]">
                        <th className="p-3">Código</th>
                        <th className="p-3">Descripción Material</th>
                        <th className="p-3 text-center">Unidad</th>
                        <th className="p-3 text-right">Cant. Estimada (Nesting)</th>
                        <th className="p-3 text-right">Cant. Real Consumida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                      {viewingFichaOrden.materialesEstimados.map((m) => (
                        <tr key={m.materialId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                          <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">{m.codigo}</td>
                          <td className="p-3 font-sans font-medium text-zinc-600 dark:text-zinc-400">{m.descripcion}</td>
                          <td className="p-3 text-center uppercase text-[10px] font-sans font-semibold text-zinc-400">{m.unidadMedida}</td>
                          <td className="p-3 text-right font-bold">{m.cantidadEstimada}</td>
                          <td className="p-3 text-right text-emerald-600 font-bold">
                            {m.cantidadReal !== undefined ? m.cantidadReal : "Pendiente"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Líneas de Firmas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-full border-b border-zinc-300 dark:border-zinc-700 h-10" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Habilitador de Corte</span>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-full border-b border-zinc-300 dark:border-zinc-700 h-10" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Armado y Operación</span>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-full border-b border-zinc-300 dark:border-zinc-700 h-10" />
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Supervisor / Control Calidad</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-5 no-print">
              <button
                onClick={() => setViewingFichaOrden(null)}
                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors focus:outline-none"
              >
                Cerrar Ficha
              </button>
              <button
                onClick={() => {
                  registrarActividad(
                    "quotes",
                    "otro",
                    `Imprimió en PDF la Orden de Trabajo ${viewingFichaOrden.folio} con membrete y logotipo corporativo.`
                  );
                  window.print();
                }}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors shadow-md shadow-emerald-500/10 focus:outline-none cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir Ficha (PDF)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
