"use client";

import React, { useState, useMemo } from "react";
import { optimizeLinearNesting } from "../linearNesting";
import { optimizeGuillotineNesting } from "../guillotineNesting";
import { LinearItem, LinearStock, BidimensionalItem, BidimensionalStock, LinearCut } from "../types";
import { Play, Plus, Trash2, Sliders, RefreshCw, Layers, Layout, AlertCircle } from "lucide-react";

export default function NestingSimulator() {
  const [activeTab, setActiveTab] = useState<"linear" | "2d">("linear");
  const [anchoCorte, setAnchoCorte] = useState<number>(4); // mm (kerf)

  // =========================================================================
  // ESTADOS DEL SIMULADOR 1D (ALUMINIO)
  // =========================================================================
  const [linearStocks, setLinearStocks] = useState<LinearStock[]>([
    { id: "stock-1", longitud: 6100, cantidad: Infinity, descripcion: "Perfil Estándar 6.10m" }
  ]);
  const [linearItems, setLinearItems] = useState<LinearItem[]>([
    { id: "item-1", longitud: 2000, cantidad: 4, etiqueta: "Montante Lateral A" },
    { id: "item-2", longitud: 1500, cantidad: 6, etiqueta: "Cabezal Superior A" },
    { id: "item-3", longitud: 950, cantidad: 8, etiqueta: "Zoclo Inferior B" }
  ]);
  const [newLinearLength, setNewLinearLength] = useState("");
  const [newLinearQty, setNewLinearQty] = useState("1");
  const [newLinearLabel, setNewLinearLabel] = useState("");

  // =========================================================================
  // ESTADOS DEL SIMULADOR 2D (VIDRIO)
  // =========================================================================
  const [glassStocks, setGlassStocks] = useState<BidimensionalStock[]>([
    { id: "stock-2d-1", ancho: 3000, alto: 2000, cantidad: Infinity, descripcion: "Plancha Vidrio 3.00x2.00m" }
  ]);
  const [glassItems, setGlassItems] = useState<BidimensionalItem[]>([
    { id: "g-item-1", ancho: 1800, alto: 900, cantidad: 2, permitirRotacion: true, etiqueta: "Vidrio Cancel Principal" },
    { id: "g-item-2", ancho: 1000, alto: 700, cantidad: 3, permitirRotacion: true, etiqueta: "Lateral Fijo" },
    { id: "g-item-3", ancho: 600, alto: 500, cantidad: 4, permitirRotacion: true, etiqueta: "Ventana Abatible" }
  ]);
  const [newGlassWidth, setNewGlassWidth] = useState("");
  const [newGlassHeight, setNewGlassHeight] = useState("");
  const [newGlassQty, setNewGlassQty] = useState("1");
  const [newGlassLabel, setNewGlassLabel] = useState("");

  // =========================================================================
  // CÁLCULOS DE OPTIMIZACIÓN (MEMOIZADOS)
  // =========================================================================
  const linearResult = useMemo(() => {
    try {
      return optimizeLinearNesting(linearItems, linearStocks, { anchoCorte });
    } catch (e: any) {
      return { error: e.message };
    }
  }, [linearItems, linearStocks, anchoCorte]);

  const glassResult = useMemo(() => {
    try {
      return optimizeGuillotineNesting(glassItems, glassStocks, { anchoCorte });
    } catch (e: any) {
      return { error: e.message };
    }
  }, [glassItems, glassStocks, anchoCorte]);

  // =========================================================================
  // ACCIONES 1D
  // =========================================================================
  const addLinearItem = () => {
    const len = parseInt(newLinearLength);
    const qty = parseInt(newLinearQty);
    if (isNaN(len) || len <= 0 || isNaN(qty) || qty <= 0) return;

    setLinearItems([
      ...linearItems,
      {
        id: `item-${Date.now()}`,
        longitud: len,
        cantidad: qty,
        etiqueta: newLinearLabel.trim() || `Pieza ${len}mm`
      }
    ]);
    setNewLinearLength("");
    setNewLinearQty("1");
    setNewLinearLabel("");
  };

  const removeLinearItem = (id: string) => {
    setLinearItems(linearItems.filter((i) => i.id !== id));
  };

  const handleStockLinearChange = (longitud: number) => {
    setLinearStocks([{ id: "stock-1", longitud, cantidad: Infinity, descripcion: `Perfil Estándar ${(longitud/1000).toFixed(2)}m` }]);
  };

  // =========================================================================
  // ACCIONES 2D
  // =========================================================================
  const addGlassItem = () => {
    const w = parseInt(newGlassWidth);
    const h = parseInt(newGlassHeight);
    const qty = parseInt(newGlassQty);
    if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0 || isNaN(qty) || qty <= 0) return;

    setGlassItems([
      ...glassItems,
      {
        id: `g-${Date.now()}`,
        ancho: w,
        alto: h,
        cantidad: qty,
        permitirRotacion: true,
        etiqueta: newGlassLabel.trim() || `${w}x${h}mm`
      }
    ]);
    setNewGlassWidth("");
    setNewGlassHeight("");
    setNewGlassQty("1");
    setNewGlassLabel("");
  };

  const removeGlassItem = (id: string) => {
    setGlassItems(glassItems.filter((i) => i.id !== id));
  };

  const handleStockGlassChange = (ancho: number, alto: number) => {
    setGlassStocks([{
      id: "stock-2d-1",
      ancho,
      alto,
      cantidad: Infinity,
      descripcion: `Plancha Vidrio ${(ancho/1000).toFixed(2)}x${(alto/1000).toFixed(2)}m`
    }]);
  };

  // =========================================================================
  // RENDER DE PALETA DE COLORES PARA PIEZAS
  // =========================================================================
  const getColorForItem = (itemId: string): string => {
    let hash = 0;
    for (let i = 0; i < itemId.length; i++) {
      hash = itemId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      "bg-teal-500 text-teal-950 border-teal-600",
      "bg-sky-500 text-sky-950 border-sky-600",
      "bg-indigo-500 text-indigo-500 border-indigo-600",
      "bg-violet-500 text-violet-950 border-violet-600",
      "bg-fuchsia-500 text-fuchsia-950 border-fuchsia-600",
      "bg-rose-500 text-rose-950 border-rose-600",
      "bg-amber-500 text-amber-950 border-amber-600",
      "bg-emerald-500 text-emerald-950 border-emerald-600"
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const getSvgColorForItem = (itemId: string): string => {
    let hash = 0;
    for (let i = 0; i < itemId.length; i++) {
      hash = itemId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      "#14b8a6", // teal
      "#0ea5e9", // sky
      "#6366f1", // indigo
      "#8b5cf6", // violet
      "#d946ef", // fuchsia
      "#f43f5e", // rose
      "#f59e0b", // amber
      "#10b981"  // emerald
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="w-full max-w-[95vw] 2xl:max-w-[1500px] mx-auto p-4 md:p-8 space-y-6">
      {/* HEADER DE CABECERA */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Optimizador de Cortes (Nesting)
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Calculadora inteligente de merma en tiempo real para perfiles de aluminio y placas de vidrio.
          </p>
        </div>
        
        {/* PARÁMETROS GENERALES */}
        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 rounded-2xl">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Sierra/Corte (mm):
          </label>
          <input
            type="number"
            min="0"
            max="15"
            value={anchoCorte}
            onChange={(e) => setAnchoCorte(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-16 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-center px-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* SELECTOR DE MÓDULO (PESTAÑAS) */}
      <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab("linear")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
            activeTab === "linear"
              ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <Layers className="w-4 h-4" />
          Aluminio (Lineal 1D)
        </button>
        <button
          onClick={() => setActiveTab("2d")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
            activeTab === "2d"
              ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <Layout className="w-4 h-4" />
          Vidrio (Placa 2D)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* =========================================================================
            PANEL IZQUIERDO: FORMULARIO Y CAPTURA
            ========================================================================= */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          
          {/* Configuración de Materia Prima (Stock) */}
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Dimensiones de Barra/Plancha Estándar
            </h2>
            {activeTab === "linear" ? (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 font-semibold mb-1">Longitud de barra comercial:</label>
                  <select
                    value={linearStocks[0].longitud}
                    onChange={(e) => handleStockLinearChange(parseInt(e.target.value))}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={6100}>6.10 metros (Estándar)</option>
                    <option value={5000}>5.00 metros</option>
                    <option value={4000}>4.00 metros</option>
                    <option value={3000}>3.00 metros</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-zinc-400 font-semibold mb-1">Medida comercial de plancha:</label>
                  <select
                    value={`${glassStocks[0].ancho}x${glassStocks[0].alto}`}
                    onChange={(e) => {
                      const [w, h] = e.target.value.split("x").map(Number);
                      handleStockGlassChange(w, h);
                    }}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="3000x2000">3.00 x 2.00 metros</option>
                    <option value="3300x2200">3.30 x 2.20 metros (Estándar)</option>
                    <option value="3600x2400">3.60 x 2.40 metros</option>
                    <option value="2500x1800">2.50 x 1.80 metros</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Formulario de Adición de Piezas */}
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Agregar Piezas a Cortar
            </h2>
            
            {activeTab === "linear" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs text-zinc-400 mb-1">Longitud (mm):</label>
                    <input
                      type="number"
                      placeholder="Ej: 1200"
                      value={newLinearLength}
                      onChange={(e) => setNewLinearLength(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Cantidad:</label>
                    <input
                      type="number"
                      min="1"
                      value={newLinearQty}
                      onChange={(e) => setNewLinearQty(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Etiqueta/Ubicación:</label>
                  <input
                    type="text"
                    placeholder="Ej: Ventana Cocina superior"
                    value={newLinearLabel}
                    onChange={(e) => setNewLinearLabel(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={addLinearItem}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-sm shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Perfil
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Ancho X (mm):</label>
                    <input
                      type="number"
                      placeholder="1200"
                      value={newGlassWidth}
                      onChange={(e) => setNewGlassWidth(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Alto Y (mm):</label>
                    <input
                      type="number"
                      placeholder="800"
                      value={newGlassHeight}
                      onChange={(e) => setNewGlassHeight(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Cant:</label>
                    <input
                      type="number"
                      min="1"
                      value={newGlassQty}
                      onChange={(e) => setNewGlassQty(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Etiqueta/Ubicación:</label>
                  <input
                    type="text"
                    placeholder="Ej: Vidrio Templado Baño"
                    value={newGlassLabel}
                    onChange={(e) => setNewGlassLabel(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={addGlassItem}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-sm shadow-emerald-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Hoja Vidrio
                </button>
              </div>
            )}
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Listado de Piezas Agregadas */}
          <div>
            <h2 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">
              Piezas en la Orden Actual
            </h2>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {activeTab === "linear" ? (
                linearItems.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-4">No hay perfiles agregados.</p>
                ) : (
                  linearItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-3 py-2 rounded-xl"
                    >
                      <div>
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {item.longitud} mm <span className="text-zinc-400">× {item.cantidad}</span>
                        </p>
                        <p className="text-xs text-zinc-400 font-medium truncate max-w-[180px]">
                          {item.etiqueta}
                        </p>
                      </div>
                      <button
                        onClick={() => removeLinearItem(item.id)}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )
              ) : (
                glassItems.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-4">No hay vidrios agregados.</p>
                ) : (
                  glassItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-3 py-2 rounded-xl"
                    >
                      <div>
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {item.ancho} × {item.alto} mm <span className="text-zinc-400">× {item.cantidad}</span>
                        </p>
                        <p className="text-xs text-zinc-400 font-medium truncate max-w-[180px]">
                          {item.etiqueta}
                        </p>
                      </div>
                      <button
                        onClick={() => removeGlassItem(item.id)}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            PANEL DERECHO: RENDERING Y KPIs
            ========================================================================= */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* CONTROL DE ERRORES EXCESO MEDIDAS */}
          {activeTab === "linear" && "error" in linearResult && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold">Error de Acomodo</h3>
                <p className="text-sm">{(linearResult as any).error}</p>
              </div>
            </div>
          )}

          {activeTab === "2d" && "error" in glassResult && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold">Error de Acomodo</h3>
                <p className="text-sm">{(glassResult as any).error}</p>
              </div>
            </div>
          )}

          {/* TARJETAS KPI */}
          {activeTab === "linear" && !("error" in linearResult) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm text-center">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Eficiencia Global</p>
                <p className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {(linearResult as any).porcentajeEficienciaGlobal}%
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm text-center">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Barras Requeridas</p>
                <p className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">
                  {(linearResult as any).barrasTotalesRequeridas}
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm text-center">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Merma Lineal</p>
                <p className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">
                  {((linearResult as any).desperdicioTotal / 1000).toFixed(2)} m
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm text-center">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Metros Cortados</p>
                <p className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">
                  {((linearResult as any).longitudTotalCorte / 1000).toFixed(2)} m
                </p>
              </div>
            </div>
          )}

          {activeTab === "2d" && !("error" in glassResult) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm text-center">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Eficiencia Global</p>
                <p className="text-2xl md:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  {(glassResult as any).porcentajeEficienciaGlobal}%
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm text-center">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Hojas Requeridas</p>
                <p className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">
                  {(glassResult as any).planchasTotalesRequeridas}
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm text-center">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Área de Merma</p>
                <p className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">
                  {((glassResult as any).desperdicioTotal / 1000000).toFixed(2)} m²
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm text-center">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Área Utilizada</p>
                <p className="text-2xl md:text-3xl font-extrabold text-zinc-800 dark:text-zinc-100 mt-1">
                  {((glassResult as any).areaTotalCorte / 1000000).toFixed(2)} m²
                </p>
              </div>
            </div>
          )}

          {/* DIAGRAMA DE CORTE (VISUALIZACIÓN) */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              Esquemas de Corte Sugeridos por el Algoritmo
            </h2>

            {/* DIAGRAMA CORTE LINEAL (1D) */}
            {activeTab === "linear" && !("error" in linearResult) && (
              <div className="space-y-6">
                {(linearResult as any).barrasProcesadas.map((barra: any, idx: number) => (
                  <div key={barra.barId} className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      <span>Barra #{idx + 1} - {barra.longitudOriginal} mm</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{barra.porcentajeEficiencia}% Eficiente</span>
                    </div>

                    {/* Barra visual en HTML */}
                    <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex shadow-inner">
                      {barra.cortes.map((corte: LinearCut, cIdx: number) => {
                        const widthPct = (corte.longitud / barra.longitudOriginal) * 100;
                        const cutWidthPct = (anchoCorte / barra.longitudOriginal) * 100;
                        
                        return (
                          <React.Fragment key={cIdx}>
                            {/* Pieza colocada */}
                            <div
                              style={{ width: `${widthPct}%` }}
                              className={`h-full border-r relative flex items-center justify-center transition-all hover:opacity-90 cursor-default group ${getColorForItem(corte.itemId)}`}
                            >
                              <span className="text-xs font-black select-none truncate px-1">
                                {corte.longitud}
                              </span>
                              {/* Tooltip de medidas */}
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 bg-zinc-900 text-white text-[10px] py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md">
                                {corte.etiqueta || 'Perfil'} ({corte.longitud}mm)
                              </span>
                            </div>

                            {/* Grosor de la sierra */}
                            {cIdx < barra.cortes.length - 1 && (
                              <div
                                style={{ width: `${cutWidthPct}%` }}
                                className="h-full bg-red-600/50"
                                title={`Grosor de corte de sierra: ${anchoCorte}mm`}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Espacio restante (Merma) */}
                      {barra.espacioRestante > 0 && (
                        <div
                          style={{ width: `${(barra.espacioRestante / barra.longitudOriginal) * 100}%` }}
                          className="h-full bg-zinc-300/40 dark:bg-zinc-800/40 border-l border-dashed border-zinc-400 flex items-center justify-center relative group"
                        >
                          <span className="text-[10px] font-bold text-zinc-400 select-none">
                            {barra.espacioRestante} mm
                          </span>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 bg-zinc-900 text-white text-[10px] py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md">
                            Sobrante / Desperdicio ({barra.espacioRestante}mm)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DIAGRAMA CORTE BIDIMENSIONAL (VIDRIO 2D) */}
            {activeTab === "2d" && !("error" in glassResult) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(glassResult as any).planchasProcesadas.map((plancha: any, idx: number) => {
                  const scale = 300 / Math.max(plancha.anchoOriginal, plancha.altoOriginal);
                  const svgWidth = plancha.anchoOriginal * scale;
                  const svgHeight = plancha.altoOriginal * scale;

                  return (
                    <div key={plancha.planchaId} className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50 dark:bg-zinc-950 space-y-3">
                      <div className="flex justify-between text-xs font-bold text-zinc-500 dark:text-zinc-400">
                        <span>Hoja #{idx + 1} - {plancha.anchoOriginal}x{plancha.altoOriginal} mm</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{plancha.porcentajeEficiencia}% Eficiente</span>
                      </div>

                      {/* SVG Canvas interactivo */}
                      <div className="flex justify-center items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 shadow-inner">
                        <svg
                          width={svgWidth}
                          height={svgHeight}
                          viewBox={`0 0 ${plancha.anchoOriginal} ${plancha.altoOriginal}`}
                          className="overflow-visible"
                        >
                          {/* Fondo de plancha (Representa la merma de fondo) */}
                          <rect
                            width={plancha.anchoOriginal}
                            height={plancha.altoOriginal}
                            fill="#f4f4f5"
                            stroke="#d4d4d8"
                            strokeWidth="2"
                            strokeDasharray="4,4"
                          />

                          {/* Render de piezas colocadas */}
                          {plancha.piezasColocadas.map((pieza: any, pIdx: number) => {
                            const fillColor = getSvgColorForItem(pieza.itemId);
                            
                            return (
                              <g key={pIdx} className="group cursor-default">
                                <rect
                                  x={pieza.x}
                                  // Postgres/Svg tiene el origen Y arriba, invertimos para render convencional (origen Y abajo)
                                  y={plancha.altoOriginal - pieza.y - pieza.alto}
                                  width={pieza.ancho}
                                  height={pieza.alto}
                                  fill={fillColor}
                                  fillOpacity="0.85"
                                  stroke="#1e293b"
                                  strokeWidth="4"
                                  className="transition-all hover:fill-opacity-100"
                                />
                                {/* Texto de etiqueta */}
                                <text
                                  x={pieza.x + pieza.ancho / 2}
                                  y={plancha.altoOriginal - pieza.y - pieza.alto / 2}
                                  textAnchor="middle"
                                  alignmentBaseline="middle"
                                  fill="#0f172a"
                                  fontSize={Math.max(12, Math.min(pieza.ancho, pieza.alto) * 0.08)}
                                  fontWeight="black"
                                  className="select-none pointer-events-none"
                                >
                                  {pieza.ancho}x{pieza.alto}
                                </text>
                                
                                {/* Info Tooltip del SVG */}
                                <title>
                                  {pieza.etiqueta || 'Vidrio'}&#10;Medidas: {pieza.ancho}x{pieza.alto}mm&#10;Rotado: {pieza.rotado ? 'Sí' : 'No'}
                                </title>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
