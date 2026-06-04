"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuotesStore } from "../../quotes/quotesStore";
import { MaterialCatalogo, ProveedorHistorico } from "../../quotes/types";
import { useAuthStore } from "../../auth/authStore";
import { 
  Package, Search, Plus, TrendingUp, History, User, Calendar, 
  DollarSign, Layers, AlertTriangle, X, Check, Eye
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

export default function InventoryDashboard() {
  const { 
    materiales, agregarMaterial, actualizarMaterial, 
    registrarCompraProveedor, actualizarCompraProveedor,
    preselectedMaterialId, setPreselectedMaterialId
  } = useQuotesStore();
  const { usuarioActivo } = useAuthStore();

  // Estados de navegación y filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"todos" | "aluminio" | "vidrio" | "herraje" | "insumo">("todos");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(materiales[0]?.id || null);

  // Efecto para preseleccionar material desde la búsqueda global
  useEffect(() => {
    if (preselectedMaterialId) {
      const mat = materiales.find((m) => m.id === preselectedMaterialId);
      if (mat) {
        setSelectedMaterialId(mat.id);
        setSearchTerm(""); // Limpiar búsqueda para asegurar visibilidad
        setActiveTab("todos"); // Limpiar filtros de categoría
        setIsEditingCard(false); // Cancelar edición de tarjeta si estaba abierta
      }
      setPreselectedMaterialId(null);
    }
  }, [preselectedMaterialId, materiales, setPreselectedMaterialId]);

  // Estados de los Formularios Modales
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialCatalogo | null>(null);

  // Estados del Formulario del Material
  const [matCodigo, setMatCodigo] = useState("");
  const [matDescripcion, setMatDescripcion] = useState("");
  const [matTipo, setMatTipo] = useState<MaterialCatalogo["tipo"]>("aluminio");
  const [matUnidad, setMatUnidad] = useState<MaterialCatalogo["unidadMedida"]>("tramo");
  const [matDimX, setMatDimX] = useState("6100");
  const [matDimY, setMatDimY] = useState("");
  const [matCosto, setMatCosto] = useState("0");
  const [matVenta, setMatVenta] = useState("0");
  const [matStock, setMatStock] = useState("10");
  const [matMinimo, setMatMinimo] = useState("5");

  // Estados del Formulario de Compra Rápida
  const [compraProveedor, setCompraProveedor] = useState("");
  const [compraFecha, setCompraFecha] = useState(new Date().toISOString().split("T")[0]);
  const [compraCosto, setCompraCosto] = useState("");
  const [compraCantidad, setCompraCantidad] = useState("10");
  const [compraComentario, setCompraComentario] = useState("");
  const [isRegistrarCompraOpen, setIsRegistrarCompraOpen] = useState(false);

  // Estados de edición rápida en tarjeta
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [cardCosto, setCardCosto] = useState("");
  const [cardVenta, setCardVenta] = useState("");
  const [cardStock, setCardStock] = useState("");
  const [cardMinimo, setCardMinimo] = useState("");

  // Estados de edición rápida en tabla
  const [isTableEditing, setIsTableEditing] = useState(false);
  const [tempMateriales, setTempMateriales] = useState<MaterialCatalogo[]>([]);

  // Estados para Compra/Proveedor Inicial (Creación de Producto)
  const [regCompraInicial, setRegCompraInicial] = useState(false);
  const [compraIniProveedor, setCompraIniProveedor] = useState("");
  const [compraIniCosto, setCompraIniCosto] = useState("");
  const [compraIniCantidad, setCompraIniCantidad] = useState("10");
  const [compraIniComentario, setCompraIniComentario] = useState("");
  const [compraIniFecha, setCompraIniFecha] = useState(new Date().toISOString().split("T")[0]);

  // Estados para la Edición de Compra Histórica
  const [editingCompraId, setEditingCompraId] = useState<string | null>(null);
  const [editCompraProveedor, setEditCompraProveedor] = useState("");
  const [editCompraFecha, setEditCompraFecha] = useState("");
  const [editCompraCosto, setEditCompraCosto] = useState("");
  const [editCompraCantidad, setEditCompraCantidad] = useState("");
  const [editCompraComentario, setEditCompraComentario] = useState("");

  const handleSelectMaterial = (id: string) => {
    setSelectedMaterialId(id);
    setIsEditingCard(false);
  };

  const handleToggleTableEdit = () => {
    if (isTableEditing) {
      setIsTableEditing(false);
      setTempMateriales([]);
    } else {
      setIsTableEditing(true);
      setTempMateriales(JSON.parse(JSON.stringify(materiales)));
    }
  };

  const handleTempMaterialFieldChange = (id: string, campo: keyof MaterialCatalogo, valor: any) => {
    setTempMateriales(prev => {
      return prev.map(m => {
        if (m.id === id) {
          const updated = { ...m, [campo]: valor };
          // Ajustes automáticos según el tipo si cambia
          if (campo === "tipo") {
            const val = valor as MaterialCatalogo["tipo"];
            if (val === "vidrio") {
              updated.unidadMedida = "m2";
              updated.dimensionX = updated.dimensionX || 3000;
              updated.dimensionY = updated.dimensionY || 2000;
            } else if (val === "aluminio") {
              updated.unidadMedida = "tramo";
              updated.dimensionX = updated.dimensionX || 6100;
              updated.dimensionY = undefined;
            } else {
              updated.unidadMedida = "pieza";
              updated.dimensionX = 1;
              updated.dimensionY = undefined;
            }
          }
          return updated;
        }
        return m;
      });
    });
  };

  const handleSaveTableChanges = () => {
    tempMateriales.forEach((tempMat) => {
      const original = materiales.find(m => m.id === tempMat.id);
      if (original) {
        const haCambiado = 
          original.codigo !== tempMat.codigo ||
          original.descripcion !== tempMat.descripcion ||
          original.tipo !== tempMat.tipo ||
          original.unidadMedida !== tempMat.unidadMedida ||
          original.dimensionX !== tempMat.dimensionX ||
          original.dimensionY !== tempMat.dimensionY ||
          original.costoBase !== tempMat.costoBase ||
          original.precioVentaBase !== tempMat.precioVentaBase ||
          original.stockActual !== tempMat.stockActual ||
          original.stockMinimo !== tempMat.stockMinimo;
          
        if (haCambiado) {
          actualizarMaterial(tempMat.id, {
            codigo: tempMat.codigo.trim().toUpperCase(),
            descripcion: tempMat.descripcion.trim(),
            tipo: tempMat.tipo,
            unidadMedida: tempMat.unidadMedida,
            dimensionX: tempMat.dimensionX,
            dimensionY: tempMat.dimensionY,
            costoBase: tempMat.costoBase,
            precioVentaBase: tempMat.precioVentaBase,
            stockActual: tempMat.stockActual,
            stockMinimo: tempMat.stockMinimo
          });
        }
      }
    });
    setIsTableEditing(false);
    setTempMateriales([]);
  };

  const handleCancelTableChanges = () => {
    setIsTableEditing(false);
    setTempMateriales([]);
  };

  // Material seleccionado actualmente
  const selectedMaterial = useMemo(() => {
    return materiales.find(m => m.id === selectedMaterialId) || materiales[0] || null;
  }, [materiales, selectedMaterialId]);

  // Filtrado de materiales (soportando temporales si estamos editando en tabla)
  const filteredMateriales = useMemo(() => {
    const listSource = isTableEditing ? tempMateriales : materiales;
    return listSource.filter(m => {
      const matchesTab = activeTab === "todos" || m.tipo === activeTab;
      const text = searchTerm.toLowerCase().trim();
      const matchesSearch = !text ||
        m.codigo.toLowerCase().includes(text) ||
        m.descripcion.toLowerCase().includes(text);
      return matchesTab && matchesSearch;
    });
  }, [materiales, tempMateriales, isTableEditing, activeTab, searchTerm]);

  // Historial de compras formateado para Recharts
  const chartData = useMemo(() => {
    if (!selectedMaterial || !selectedMaterial.historialProveedores || selectedMaterial.historialProveedores.length === 0) {
      // Data de respaldo si no hay historial
      return [
        { fecha: "Actual", costo: selectedMaterial?.costoBase || 0 }
      ];
    }
    // Clonar e invertir para graficar cronológicamente
    return [...selectedMaterial.historialProveedores]
      .reverse()
      .map(entry => ({
        fecha: entry.fecha,
        costo: entry.costoUnitario,
        proveedor: entry.nombre
      }));
  }, [selectedMaterial]);

  // Abrir modal de creación
  const handleNewMaterialClick = () => {
    setEditingMaterial(null);
    setMatCodigo("");
    setMatDescripcion("");
    setMatTipo("aluminio");
    setMatUnidad("tramo");
    setMatDimX("6100");
    setMatDimY("");
    setMatCosto("");
    setMatVenta("");
    setMatStock("10");
    setMatMinimo("5");

    // Resetear estados de proveedor inicial
    setRegCompraInicial(false);
    setCompraIniProveedor("");
    setCompraIniCosto("");
    setCompraIniCantidad("10");
    setCompraIniComentario("");
    setCompraIniFecha(new Date().toISOString().split("T")[0]);

    setIsMaterialModalOpen(true);
  };

  // Abrir modal de edición
  const handleEditMaterialClick = (material: MaterialCatalogo) => {
    setEditingMaterial(material);
    setMatCodigo(material.codigo);
    setMatDescripcion(material.descripcion);
    setMatTipo(material.tipo);
    setMatUnidad(material.unidadMedida);
    setMatDimX(material.dimensionX.toString());
    setMatDimY(material.dimensionY?.toString() || "");
    setMatCosto(material.costoBase.toString());
    setMatVenta(material.precioVentaBase.toString());
    setMatStock((material.stockActual ?? 0).toString());
    setMatMinimo((material.stockMinimo ?? 0).toString());
    setIsMaterialModalOpen(true);
  };

  // Guardar Material (Creación o Edición)
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matCodigo.trim() || !matDescripcion.trim()) return;

    // Limpiar y parsear dimensiones (previene truncados por comas o ingreso en metros)
    const rawDimX = matDimX.trim();
    let parsedDimX = parseFloat(rawDimX.replace(/,/g, ""));
    if (parsedDimX > 0 && parsedDimX < 50) {
      parsedDimX = parsedDimX * 1000; // Asumimos metros si es menor a 50 (ej: 6.1m -> 6100mm)
    }
    const dimensionX = Math.round(parsedDimX) || 0;

    const rawDimY = matDimY?.trim() || "";
    let parsedDimY = rawDimY ? parseFloat(rawDimY.replace(/,/g, "")) : undefined;
    if (parsedDimY !== undefined && parsedDimY > 0 && parsedDimY < 50) {
      parsedDimY = parsedDimY * 1000; // Asumimos metros si es menor a 50 (ej: 2m -> 2000mm)
    }
    const dimensionY = parsedDimY ? Math.round(parsedDimY) : undefined;

    const payload = {
      codigo: matCodigo.trim().toUpperCase(),
      descripcion: matDescripcion.trim(),
      tipo: matTipo,
      unidadMedida: matUnidad,
      dimensionX,
      dimensionY,
      costoBase: parseFloat(matCosto) || 0,
      precioVentaBase: parseFloat(matVenta) || 0,
      stockActual: parseInt(matStock) || 0,
      stockMinimo: parseInt(matMinimo) || 0
    };

    if (editingMaterial) {
      actualizarMaterial(editingMaterial.id, payload);
    } else {
      const compraInicial = regCompraInicial ? {
        nombre: compraIniProveedor.trim() || "Proveedor Inicial",
        fecha: compraIniFecha,
        costoUnitario: parseFloat(compraIniCosto) || parseFloat(matCosto) || 0,
        cantidadComprada: parseInt(compraIniCantidad) || parseInt(matStock) || 0,
        comentario: compraIniComentario.trim() || undefined
      } : undefined;

      agregarMaterial(payload, compraInicial);
    }
    setIsMaterialModalOpen(false);
  };

  // Lógica para Edición de Compra Histórica
  const handleStartEditCompra = (item: ProveedorHistorico) => {
    setEditingCompraId(item.id);
    setEditCompraProveedor(item.nombre);
    setEditCompraFecha(item.fecha);
    setEditCompraCosto(item.costoUnitario.toString());
    setEditCompraCantidad(item.cantidadComprada.toString());
    setEditCompraComentario(item.comentario || "");
  };

  const handleSaveEditCompra = (compraId: string) => {
    if (!selectedMaterial) return;
    actualizarCompraProveedor(selectedMaterial.id, compraId, {
      nombre: editCompraProveedor.trim(),
      fecha: editCompraFecha,
      costoUnitario: parseFloat(editCompraCosto) || 0,
      cantidadComprada: parseInt(editCompraCantidad) || 0,
      comentario: editCompraComentario.trim() || undefined
    });
    setEditingCompraId(null);
  };

  // Registrar Compra de Proveedor
  const handleRegisterPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !compraProveedor.trim() || !compraCosto.trim()) return;

    const entry = {
      nombre: compraProveedor.trim(),
      fecha: compraFecha,
      costoUnitario: parseFloat(compraCosto) || 0,
      cantidadComprada: parseInt(compraCantidad) || 0,
      comentario: compraComentario.trim() || undefined
    };

    registrarCompraProveedor(selectedMaterial.id, entry);

    // Resetear formulario de compra rápida
    setCompraProveedor("");
    setCompraCosto("");
    setCompraCantidad("10");
    setCompraComentario("");
    setIsRegistrarCompraOpen(false);
  };

  return (
    <div className="w-full max-w-[95vw] 2xl:max-w-[1500px] mx-auto p-4 md:p-8 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Control de Inventario
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Administración de costos base de insumos, stock disponible y registro histórico de compras a proveedores.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {isTableEditing ? (
            <>
              <button
                onClick={handleCancelTableChanges}
                className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold py-2.5 px-4 rounded-xl transition-all border border-zinc-200 dark:border-zinc-700 text-sm"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button
                onClick={handleSaveTableChanges}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm shadow-emerald-500/20 text-sm"
              >
                <Check className="w-4 h-4" />
                Guardar Todo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleToggleTableEdit}
                className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold py-2.5 px-4 rounded-xl transition-all border border-zinc-200 dark:border-zinc-700 text-sm"
              >
                <Package className="w-4 h-4 text-emerald-600" />
                Editar Inventario
              </button>
              <button
                onClick={handleNewMaterialClick}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm shadow-emerald-500/20 text-sm"
              >
                <Plus className="w-4 h-4" />
                Nuevo Material
              </button>
            </>
          )}
        </div>
      </div>

      {/* TABS DE FILTRO Y BUSCADOR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-5 relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar material por código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
          />
        </div>

        <div className="md:col-span-7 flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl overflow-x-auto">
          {(["todos", "aluminio", "vidrio", "herraje", "insumo"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-xs font-bold py-2 px-3 capitalize rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              {tab === "todos" ? "Todos los Insumos" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE DISTRIBUCIÓN: LISTADO DE MATERIALES + DETALLE LATERAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LISTADO DE MATERIALES (IZQUIERDA) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-950">
                    <th className="px-6 py-4">Código</th>
                    <th className="px-6 py-4">Descripción</th>
                    <th className="px-6 py-4 text-center">Tipo</th>
                    <th className="px-6 py-4 text-right">Stock</th>
                    <th className="px-6 py-4 text-right">Costo Base</th>
                    <th className="px-6 py-4 text-center">{isTableEditing ? "P. Venta" : "Acciones"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {filteredMateriales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-sm text-zinc-400 font-medium">
                        No se encontraron materiales en esta categoría.
                      </td>
                    </tr>
                  ) : (
                    filteredMateriales.map((m) => {
                      const isLowStock = (m.stockActual ?? 0) <= (m.stockMinimo ?? 0);
                      
                      if (isTableEditing) {
                        return (
                          <tr
                            key={m.id}
                            onClick={() => handleSelectMaterial(m.id)}
                            className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer ${
                              selectedMaterialId === m.id ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""
                            }`}
                          >
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={m.codigo}
                                onChange={(e) => handleTempMaterialFieldChange(m.id, "codigo", e.target.value)}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-black uppercase text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={m.descripcion}
                                onChange={(e) => handleTempMaterialFieldChange(m.id, "descripcion", e.target.value)}
                                className="w-full min-w-[120px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-zinc-800 dark:text-zinc-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={m.tipo}
                                onChange={(e) => handleTempMaterialFieldChange(m.id, "tipo", e.target.value as MaterialCatalogo["tipo"])}
                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-zinc-800 dark:text-zinc-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                              >
                                <option value="aluminio">Aluminio</option>
                                <option value="vidrio">Vidrio</option>
                                <option value="herraje">Herraje</option>
                                <option value="insumo">Insumo</option>
                              </select>
                            </td>
                            <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  value={m.stockActual ?? 0}
                                  onChange={(e) => handleTempMaterialFieldChange(m.id, "stockActual", parseInt(e.target.value) || 0)}
                                  className="w-16 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-black text-right text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                                <span className="text-[10px] text-zinc-400 font-semibold">{m.unidadMedida}s</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-0.5">
                                <span className="text-xs text-zinc-400">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={m.costoBase}
                                  onChange={(e) => handleTempMaterialFieldChange(m.id, "costoBase", parseFloat(e.target.value) || 0)}
                                  className="w-20 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-black text-right text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-0.5">
                                <span className="text-xs text-emerald-500">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={m.precioVentaBase}
                                  onChange={(e) => handleTempMaterialFieldChange(m.id, "precioVentaBase", parseFloat(e.target.value) || 0)}
                                  className="w-20 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-black text-right text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={m.id}
                          onClick={() => handleSelectMaterial(m.id)}
                          className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer ${
                            selectedMaterialId === m.id ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""
                          }`}
                        >
                          <td className="px-6 py-4 font-black text-xs text-zinc-800 dark:text-zinc-100 whitespace-nowrap">
                            {m.codigo}
                          </td>
                          <td className="px-6 py-4 font-bold text-xs text-zinc-800 dark:text-zinc-300 max-w-[200px] truncate">
                            {m.descripcion}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500">
                              {m.tipo}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 font-black text-xs">
                              {isLowStock && (
                                <span title="Bajo Stock de Seguridad">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                </span>
                              )}
                              <span className={isLowStock ? "text-amber-600 dark:text-amber-500 font-black" : "text-zinc-800 dark:text-zinc-200"}>
                                {m.stockActual ?? 0}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-semibold">{m.unidadMedida}s</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-xs text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            ${m.costoBase.toLocaleString("es-MX")}
                          </td>
                          <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center gap-1.5">
                              <button
                                onClick={() => handleEditMaterialClick(m)}
                                className="px-2.5 py-1 text-[10px] font-bold text-white bg-zinc-800 hover:bg-zinc-900 rounded-lg transition-colors"
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* DETALLE Y PROVEEDORES (DERECHA) */}
        <div className="lg:col-span-5">
          {selectedMaterial ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-md">
              
              {/* Encabezado Ficha */}
              <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-4 gap-2">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                    Ficha de Insumo: {selectedMaterial.tipo}
                  </span>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
                    {selectedMaterial.descripcion}
                  </h3>
                  <p className="text-xs text-zinc-400 font-semibold">Código único: {selectedMaterial.codigo}</p>
                </div>
                
                <button
                  onClick={() => {
                    if (isEditingCard) {
                      setIsEditingCard(false);
                    } else {
                      setCardCosto(selectedMaterial.costoBase.toString());
                      setCardVenta(selectedMaterial.precioVentaBase.toString());
                      setCardStock((selectedMaterial.stockActual ?? 0).toString());
                      setCardMinimo((selectedMaterial.stockMinimo ?? 0).toString());
                      setIsEditingCard(true);
                    }
                  }}
                  className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg border transition-all shrink-0 ${
                    isEditingCard 
                      ? "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-200 dark:border-red-900/50 hover:bg-red-100" 
                      : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {isEditingCard ? "Cancelar" : "Editar Valores"}
                </button>
              </div>

              {/* Atributos Clave */}
              {isEditingCard ? (
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Editar Valores del Insumo</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-zinc-400 font-bold mb-1">Costo Base ($):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={cardCosto}
                        onChange={(e) => setCardCosto(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 font-bold mb-1">Precio Venta ($):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={cardVenta}
                        onChange={(e) => setCardVenta(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-zinc-400 font-bold mb-1">Existencia (Stock):</label>
                      <input
                        type="number"
                        value={cardStock}
                        onChange={(e) => setCardStock(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 font-bold mb-1">Stock Mínimo:</label>
                      <input
                        type="number"
                        value={cardMinimo}
                        onChange={(e) => setCardMinimo(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200/30">
                    <button
                      type="button"
                      onClick={() => {
                        actualizarMaterial(selectedMaterial.id, {
                          costoBase: parseFloat(cardCosto) || 0,
                          precioVentaBase: parseFloat(cardVenta) || 0,
                          stockActual: parseInt(cardStock) || 0,
                          stockMinimo: parseInt(cardMinimo) || 0
                        });
                        setIsEditingCard(false);
                      }}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-xl transition-all shadow-sm text-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Costo Base</p>
                    <p className="text-base font-black text-zinc-800 dark:text-zinc-100 mt-0.5">
                      ${selectedMaterial.costoBase.toLocaleString("es-MX")}
                    </p>
                    <p className="text-[9px] text-zinc-400">MXN / {selectedMaterial.unidadMedida}</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">P. Venta Base</p>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ${selectedMaterial.precioVentaBase.toLocaleString("es-MX")}
                    </p>
                    <p className="text-[9px] text-zinc-400">Sugerido catálogo</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Existencia</p>
                    <p className={`text-base font-black mt-0.5 ${(selectedMaterial.stockActual ?? 0) <= (selectedMaterial.stockMinimo ?? 0) ? "text-amber-600 dark:text-amber-500" : "text-zinc-800 dark:text-zinc-100"}`}>
                      {selectedMaterial.stockActual ?? 0}
                    </p>
                    <p className="text-[9px] text-zinc-400">Min. req: {selectedMaterial.stockMinimo ?? 0}</p>
                  </div>
                </div>
              )}

              {/* Parámetros Técnicos */}
              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800 text-xs space-y-1.5 text-zinc-500 dark:text-zinc-400">
                <p className="font-bold text-zinc-800 dark:text-zinc-200 border-b border-zinc-200 dark:border-zinc-800 pb-1.5 mb-1.5 uppercase text-[10px] tracking-wider">Dimensionamiento Técnico</p>
                <p><span className="font-bold text-zinc-700 dark:text-zinc-300">Unidad de Medición:</span> {selectedMaterial.unidadMedida.toUpperCase()}</p>
                <p><span className="font-bold text-zinc-700 dark:text-zinc-300">Largo / Medida X:</span> {selectedMaterial.dimensionX} mm ({(selectedMaterial.dimensionX / 1000).toFixed(2)}m)</p>
                {selectedMaterial.dimensionY && (
                  <p><span className="font-bold text-zinc-700 dark:text-zinc-300">Alto / Medida Y:</span> {selectedMaterial.dimensionY} mm ({(selectedMaterial.dimensionY / 1000).toFixed(2)}m)</p>
                )}
              </div>

              {/* GRÁFICO HISTÓRICO DE COSTOS */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-zinc-400" />
                  Evolución Histórica de Costo de Compra
                </span>

                <div className="h-44 w-full bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                      <XAxis dataKey="fecha" stroke="#a1a1aa" fontSize={8} tickLine={false} />
                      <YAxis stroke="#a1a1aa" fontSize={8} tickLine={false} domain={["auto", "auto"]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#18181b", 
                          borderColor: "#27272a", 
                          borderRadius: "12px",
                          fontSize: "11px",
                          color: "#fff"
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="costo" 
                        stroke="#059669" 
                        strokeWidth={2} 
                        dot={{ r: 4, strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                        name="Costo de Compra ($)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* HISTÓRICO DE PROVEEDORES (LÍNEA DE TIEMPO) */}
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-zinc-400" />
                    Historial de Proveedores
                  </span>
                  <button
                    onClick={() => setIsRegistrarCompraOpen(!isRegistrarCompraOpen)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 focus:outline-none"
                  >
                    <Plus className="w-3 h-3" /> Registrar Compra
                  </button>
                </div>

                {/* Formulario Rápido de Compra */}
                {isRegistrarCompraOpen && (
                  <form onSubmit={handleRegisterPurchase} className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3 shadow-inner">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      Registrar Entrada de Lote (Compra)
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-zinc-400 font-bold mb-1">Nombre Proveedor:</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Aluminios del Sur"
                          value={compraProveedor}
                          onChange={(e) => setCompraProveedor(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-semibold text-zinc-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-400 font-bold mb-1">Costo Unitario ($):</label>
                        <input
                          type="number"
                          required
                          step="0.01"
                          placeholder="Ej: 325.50"
                          value={compraCosto}
                          onChange={(e) => setCompraCosto(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-zinc-400 font-bold mb-1">Cantidad Comprada:</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={compraCantidad}
                          onChange={(e) => setCompraCantidad(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-400 font-bold mb-1">Fecha:</label>
                        <input
                          type="date"
                          required
                          value={compraFecha}
                          onChange={(e) => setCompraFecha(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-semibold text-zinc-800 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="text-xs">
                      <label className="block text-[10px] text-zinc-400 font-bold mb-1">Comentarios / Observaciones:</label>
                      <input
                        type="text"
                        placeholder="Ej: Lote con certificación de temple..."
                        value={compraComentario}
                        onChange={(e) => setCompraComentario(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setIsRegistrarCompraOpen(false)}
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold text-white shadow-sm"
                      >
                        Confirmar Entrada
                      </button>
                    </div>
                  </form>
                )}

                {/* Línea de Tiempo del Historial */}
                {(!selectedMaterial.historialProveedores || selectedMaterial.historialProveedores.length === 0) ? (
                  <p className="text-[11px] text-zinc-400 italic bg-zinc-50 dark:bg-zinc-950/30 p-4 rounded-xl text-center border border-dashed border-zinc-200/50">
                    No hay registro histórico de compras para este material.
                  </p>
                ) : (
                  <div className="relative pl-4 border-l-2 border-zinc-100 dark:border-zinc-800 space-y-4 pt-1">
                    {selectedMaterial.historialProveedores.map((item) => {
                      const isEditingThis = editingCompraId === item.id;
                      
                      return (
                        <div key={item.id} className="relative text-xs">
                          {/* Dot indicador */}
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white dark:border-zinc-900" />
                          
                          {isEditingThis ? (
                            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 ml-1 shadow-inner" onClick={(e) => e.stopPropagation()}>
                              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Editar Compra</p>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] text-zinc-400 font-bold mb-0.5">Proveedor:</label>
                                  <input
                                    type="text"
                                    value={editCompraProveedor}
                                    onChange={(e) => setEditCompraProveedor(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 text-[11px] font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-zinc-400 font-bold mb-0.5">Fecha:</label>
                                  <input
                                    type="date"
                                    value={editCompraFecha}
                                    onChange={(e) => setEditCompraFecha(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-1.5 py-1 text-[11px] font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] text-zinc-400 font-bold mb-0.5">Costo Unit ($):</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editCompraCosto}
                                    onChange={(e) => setEditCompraCosto(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 text-[11px] font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] text-zinc-400 font-bold mb-0.5">Cant. Comprada:</label>
                                  <input
                                    type="number"
                                    value={editCompraCantidad}
                                    onChange={(e) => setEditCompraCantidad(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 text-[11px] font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[9px] text-zinc-400 font-bold mb-0.5">Comentarios:</label>
                                <input
                                  type="text"
                                  value={editCompraComentario}
                                  onChange={(e) => setEditCompraComentario(e.target.value)}
                                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 text-[11px] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>

                              <div className="flex justify-end gap-1.5 pt-1.5 border-t border-zinc-200/30">
                                <button
                                  type="button"
                                  onClick={() => setEditingCompraId(null)}
                                  className="px-2 py-1 rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-bold text-zinc-600 dark:text-zinc-300"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditCompra(item.id)}
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-[10px] font-bold text-white shadow-sm shadow-emerald-500/10"
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start group">
                              <div>
                                <p className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                                  <User className="w-3 h-3 text-zinc-400 shrink-0" /> {item.nombre}
                                </p>
                                <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3 text-zinc-400 shrink-0" /> {item.fecha}
                                </p>
                                {item.comentario && (
                                  <p className="text-[10px] text-zinc-400 italic bg-zinc-50 dark:bg-zinc-950 px-2 py-0.5 rounded border border-zinc-200/30 dark:border-zinc-800/30 mt-1 max-w-xs">
                                    {item.comentario}
                                  </p>
                                )}
                              </div>
                              <div className="text-right whitespace-nowrap flex flex-col items-end">
                                <span className="font-black text-zinc-900 dark:text-zinc-100">
                                  ${item.costoUnitario.toLocaleString("es-MX")} / u
                                </span>
                                <p className="text-[10px] text-zinc-400">Compró {item.cantidadComprada} unids</p>
                                
                                <button
                                  type="button"
                                  onClick={() => handleStartEditCompra(item)}
                                  className="text-[9px] text-emerald-600 hover:text-emerald-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity mt-1 focus:outline-none flex items-center gap-0.5 border border-zinc-200 dark:border-zinc-800 rounded px-1 py-0.5 bg-zinc-50 dark:bg-zinc-950/40"
                                >
                                  Editar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center text-zinc-400 italic text-sm">
              Selecciona un material del inventario para ver su expediente y precios de proveedores.
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE NUEVO/EDITAR MATERIAL */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6">
            
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                {editingMaterial ? `Editar Insumo: ${editingMaterial.codigo}` : "Registrar Nuevo Material"}
              </h3>
              <button 
                onClick={() => setIsMaterialModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 rounded-lg p-1.5 focus:outline-none hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              
              {/* Código y Nombre */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Código Único:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: AL-BOL-NAT"
                    value={matCodigo}
                    onChange={(e) => setMatCodigo(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Tipo de Insumo:</label>
                  <select
                    value={matTipo}
                    onChange={(e) => {
                      const val = e.target.value as MaterialCatalogo["tipo"];
                      setMatTipo(val);
                      if (val === "vidrio") {
                        setMatUnidad("m2");
                        setMatDimX("3000");
                        setMatDimY("2000");
                      } else if (val === "aluminio") {
                        setMatUnidad("tramo");
                        setMatDimX("6100");
                        setMatDimY("");
                      } else {
                        setMatUnidad("pieza");
                        setMatDimX("1");
                        setMatDimY("");
                      }
                    }}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="aluminio">Perfil de Aluminio</option>
                    <option value="vidrio">Plancha de Vidrio</option>
                    <option value="herraje">Herraje / Accesorio</option>
                    <option value="insumo">Insumo Consumible</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Descripción del Material:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Perfil bolsa de 3 pulgadas color natural anodizado"
                  value={matDescripcion}
                  onChange={(e) => setMatDescripcion(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Unidad y Medidas */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Unidad Medida:</label>
                  <select
                    value={matUnidad}
                    onChange={(e) => setMatUnidad(e.target.value as MaterialCatalogo["unidadMedida"])}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="tramo">Tramo (Perfil)</option>
                    <option value="m2">Metro Cuadrado (Planchas)</option>
                    <option value="pieza">Pieza (Unidad)</option>
                  </select>
                </div>
                 <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Medida X (mm):</label>
                  <input
                    type="text"
                    required
                    placeholder="Largo en mm"
                    value={matDimX}
                    onChange={(e) => setMatDimX(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 leading-tight">
                    Ej: 6100. Valores menores a 50 se tomarán en metros y se convertirán automáticamente (ej: 6.1m ➔ 6100mm).
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Medida Y (mm) (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Alto en mm"
                    value={matDimY}
                    onChange={(e) => setMatDimY(e.target.value)}
                    disabled={matTipo !== "vidrio"}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 leading-tight">
                    Ej: 2000. Valores menores a 50 se tomarán en metros y se convertirán automáticamente (ej: 2m ➔ 2000mm).
                  </p>
                </div>
              </div>

              {/* Costo base y precio sugerido */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Costo Base de Compra ($):</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="Ej: 320.00"
                    value={matCosto}
                    onChange={(e) => setMatCosto(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Precio Venta Base ($):</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="Ej: 500.00"
                    value={matVenta}
                    onChange={(e) => setMatVenta(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Stocks simulados */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Stock Actual (Fáctico):</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 10"
                    value={matStock}
                    onChange={(e) => setMatStock(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Stock Mínimo Alerta:</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 5"
                    value={matMinimo}
                    onChange={(e) => setMatMinimo(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Registro de Compra/Proveedor Inicial al dar de alta */}
              {!editingMaterial && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="regCompraInicial"
                      checked={regCompraInicial}
                      onChange={(e) => {
                        setRegCompraInicial(e.target.checked);
                        if (e.target.checked) {
                          setCompraIniCosto(matCosto);
                          setCompraIniCantidad(matStock);
                        }
                      }}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950"
                    />
                    <label htmlFor="regCompraInicial" className="text-xs font-black text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                      Registrar Compra Inicial de Proveedor (Crea historial)
                    </label>
                  </div>

                  {regCompraInicial && (
                    <div className="bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3 shadow-inner transition-all duration-300">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        Datos del Proveedor y Lote Inicial
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold mb-1">Nombre Proveedor:</label>
                          <input
                            type="text"
                            required={regCompraInicial}
                            placeholder="Ej: Distribuidora del Norte"
                            value={compraIniProveedor}
                            onChange={(e) => setCompraIniProveedor(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold mb-1">Costo Unitario ($):</label>
                          <input
                            type="number"
                            required={regCompraInicial}
                            step="0.01"
                            placeholder="Ej: 320"
                            value={compraIniCosto}
                            onChange={(e) => setCompraIniCosto(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold mb-1">Cantidad Comprada:</label>
                          <input
                            type="number"
                            required={regCompraInicial}
                            min="1"
                            value={compraIniCantidad}
                            onChange={(e) => setCompraIniCantidad(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold mb-1">Fecha de Compra:</label>
                          <input
                            type="date"
                            required={regCompraInicial}
                            value={compraIniFecha}
                            onChange={(e) => setCompraIniFecha(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="text-xs">
                        <label className="block text-[10px] text-zinc-400 font-bold mb-1">Comentario Inicial:</label>
                        <input
                          type="text"
                          placeholder="Ej: Compra lote inicial..."
                          value={compraIniComentario}
                          onChange={(e) => setCompraIniComentario(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm shadow-emerald-500/20"
                >
                  {editingMaterial ? "Guardar Cambios" : "Crear Material"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
