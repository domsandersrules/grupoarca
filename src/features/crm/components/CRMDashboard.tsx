"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useCRMStore } from "../crmStore";
import { useAuthStore } from "../../auth/authStore";
import { useConfigStore } from "@/features/config/configStore";
import { useQuotesStore } from "../../quotes/quotesStore";
import { Cliente, DatosFiscalesMX, RegimenFiscalOption } from "../types";
import { 
  Users, UserPlus, Search, Edit3, Trash2, CheckCircle, 
  XCircle, Receipt, Building, Phone, Mail, FileText, ChevronRight, Filter, AlertTriangle 
} from "lucide-react";

// Regex Oficial del SAT para RFC (Físicas y Morales)
const RFC_REGEX = /^([A-ZÑ&]{3,4}) ?(\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])) ?([A-Z\d]{3})$/i;

interface CRMDashboardProps {
  onNavigate?: (module: any) => void;
}

export default function CRMDashboard({ onNavigate }: CRMDashboardProps) {
  const { 
    clientes, 
    agregarCliente, 
    actualizarCliente, 
    eliminarCliente,
    preselectedClienteId,
    setPreselectedClienteId
  } = useCRMStore();

  const { usuarioActivo, registrarActividad } = useAuthStore();
  const { sucursales, sucursalActivaId, setSucursalActivaId } = useConfigStore();

  const getSucursalName = (id: string) => {
    const suc = sucursales.find((s) => s.id === id);
    return suc ? suc.nombre : "Matriz Central";
  };

  // Estados del CRM
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  // Estados del Formulario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [requiereFactura, setRequiereFactura] = useState(false);
  const [estatus, setEstatus] = useState<"prospecto" | "activo" | "inactivo">("prospecto");
  const [notas, setNotas] = useState("");

  // Estados Datos Fiscales
  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [regimenFiscal, setRegimenFiscal] = useState<RegimenFiscalOption>("601");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [calle, setCalle] = useState("");
  const [numExt, setNumExt] = useState("");
  const [colonia, setColonia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [estadoDir, setEstadoDir] = useState("");

  // Detalles en Panel Lateral
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  // Efecto para preseleccionar cliente desde la búsqueda global
  useEffect(() => {
    if (preselectedClienteId) {
      const cliente = clientes.find((c) => c.id === preselectedClienteId);
      if (cliente) {
        setSelectedCliente(cliente);
        setSearchTerm(""); // Limpiar búsqueda para asegurar que el cliente sea visible
        setStatusFilter("todos"); // Limpiar filtros de estado
      }
      setPreselectedClienteId(null);
    }
  }, [preselectedClienteId, clientes, setPreselectedClienteId]);

  // Validación de RFC en tiempo real
  const isRfcValido = useMemo(() => {
    if (!rfc) return true; // Si está vacío es válido porque puede no requerir factura
    return RFC_REGEX.test(rfc.trim());
  }, [rfc]);

  // Filtrado de clientes
  const filteredClientes = useMemo(() => {
    return clientes.filter((c) => {
      // Filtro de sucursal (Matriz ve todo, sucursales ven lo suyo)
      const matchesSucursal = sucursalActivaId === "todos" || c.sucursalId === sucursalActivaId;
      
      // Filtro por estatus
      const matchesStatus = statusFilter === "todos" || c.estatus === statusFilter;

      // Filtro por búsqueda de texto
      const text = searchTerm.toLowerCase().trim();
      const matchesSearch = !text || 
        c.nombre.toLowerCase().includes(text) ||
        (c.email && c.email.toLowerCase().includes(text)) ||
        (c.datosFiscales?.rfc && c.datosFiscales.rfc.toLowerCase().includes(text));

      return matchesSucursal && matchesStatus && matchesSearch;
    });
  }, [clientes, sucursalActivaId, statusFilter, searchTerm]);

  // Abrir formulario para agregar
  const handleOpenAdd = () => {
    setEditingCliente(null);
    setNombre("");
    setEmail("");
    setTelefono("");
    setWhatsapp("");
    setRequiereFactura(false);
    setEstatus("prospecto");
    setNotas("");
    setRfc("");
    setRazonSocial("");
    setRegimenFiscal("601");
    setCodigoPostal("");
    setCalle("");
    setNumExt("");
    setColonia("");
    setMunicipio("");
    setEstadoDir("");
    setIsFormOpen(true);
  };

  // Abrir formulario para editar
  const handleOpenEdit = (cliente: Cliente, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que se abra el panel de detalles
    setEditingCliente(cliente);
    setNombre(cliente.nombre);
    setEmail(cliente.email || "");
    setTelefono(cliente.telefono || "");
    setWhatsapp(cliente.whatsapp || "");
    setRequiereFactura(cliente.requiereFactura);
    setEstatus(cliente.estatus);
    setNotas(cliente.notas || "");
    
    if (cliente.datosFiscales) {
      setRfc(cliente.datosFiscales.rfc);
      setRazonSocial(cliente.datosFiscales.razonSocial);
      setRegimenFiscal(cliente.datosFiscales.regimenFiscal);
      setCodigoPostal(cliente.datosFiscales.codigoPostal);
      setCalle(cliente.datosFiscales.calle || "");
      setNumExt(cliente.datosFiscales.numeroExterior || "");
      setColonia(cliente.datosFiscales.colonia || "");
      setMunicipio(cliente.datosFiscales.municipio || "");
      setEstadoDir(cliente.datosFiscales.estado || "");
    } else {
      setRfc("");
      setRazonSocial("");
      setRegimenFiscal("601");
      setCodigoPostal("");
      setCalle("");
      setNumExt("");
      setColonia("");
      setMunicipio("");
      setEstadoDir("");
    }
    setIsFormOpen(true);
  };

  // Autocompletar RFC válido de prueba
  const fillSampleRfc = () => {
    setRfc("CAL120405H12");
    setRazonSocial("CONSTRUCTORA ALTIPLANO SA DE CV");
    setCodigoPostal("06600");
    setRegimenFiscal("601");
    setCalle("Av. Paseo de la Reforma");
    setNumExt("222");
    setColonia("Juárez");
    setMunicipio("Cuauhtémoc");
    setEstadoDir("Ciudad de México");
  };

  // Guardar Cliente (Alta / Edición)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    if (requiereFactura && !isRfcValido) return;

    const datosFiscales: DatosFiscalesMX | undefined = requiereFactura ? {
      rfc: rfc.toUpperCase().trim(),
      razonSocial: razonSocial.trim(),
      regimenFiscal,
      codigoPostal: codigoPostal.trim(),
      calle: calle.trim(),
      numeroExterior: numExt.trim(),
      colonia: colonia.trim(),
      municipio: municipio.trim(),
      estado: estadoDir.trim()
    } : undefined;

    const sucursalDefecto = sucursales.filter(s => s.activa)[0]?.id || "suc-1";
    const clienteData = {
      sucursalId: sucursalActivaId === "todos" ? sucursalDefecto : sucursalActivaId, // Asignar a sucursal activa
      nombre: nombre.trim(),
      email: email.trim() || undefined,
      telefono: telefono.trim() || undefined,
      whatsapp: whatsapp.trim() || undefined,
      requiereFactura,
      datosFiscales,
      estatus,
      notas: notas.trim() || undefined
    };

    if (editingCliente) {
      actualizarCliente(editingCliente.id, clienteData);
      registrarActividad(
        "crm",
        "modificar",
        `Modificó datos del cliente: ${clienteData.nombre} (${clienteData.estatus.toUpperCase()})`
      );
      if (selectedCliente?.id === editingCliente.id) {
        setSelectedCliente({ ...selectedCliente, ...clienteData });
      }
    } else {
      const newClientId = agregarCliente(clienteData);
      registrarActividad(
        "crm",
        "crear",
        `Creó nuevo cliente en CRM: ${clienteData.nombre} (${clienteData.estatus.toUpperCase()})`
      );
      if (newClientId && onNavigate) {
        useQuotesStore.getState().setPreselectedClienteId(newClientId);
        onNavigate("quotes");
      }
    }

    setIsFormOpen(false);
  };

  // Eliminar Cliente
  const handleDelete = (id: string, clienteNombre: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (usuarioActivo.rol !== "admin") {
      alert("Acceso denegado: Solo el Administrador puede eliminar clientes.");
      return;
    }
    if (confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
      eliminarCliente(id);
      registrarActividad(
        "crm",
        "eliminar",
        `Eliminó al cliente del CRM: ${clienteNombre}`
      );
      if (selectedCliente?.id === id) {
        setSelectedCliente(null);
      }
    }
  };

  return (
    <div className="w-full max-w-[95vw] 2xl:max-w-[1500px] mx-auto px-4 md:px-8 pb-10 space-y-6">

      {/* ═══════════════════════════════════════════════════
          HERO BANNER — CRM
      ═══════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 border border-zinc-700/50 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 15% 50%, #a855f7 0%, transparent 50%), radial-gradient(circle at 85% 30%, #6366f1 0%, transparent 40%)" }} />
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/5 rounded-full -translate-y-24 translate-x-24 blur-3xl" />

        <div className="relative p-6 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            {/* Título + descripción */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white shadow-lg shadow-violet-500/25">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 bg-violet-400/10 border border-violet-400/20 px-3 py-1 rounded-full">
                  Módulo CRM
                </span>
              </div>
              <h1 className="text-2xl font-black text-white leading-tight">
                CRM & <span className="text-violet-400">Clientes</span>
              </h1>
              <p className="text-zinc-400 text-sm max-w-lg">
                Gestión de cartera, prospectos de venta y datos fiscales CFDI 4.0 para facturación electrónica.
              </p>
            </div>

            {/* KPI Pills de métricas rápidas */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Total Clientes", val: clientes.filter(c => sucursalActivaId === "todos" || c.sucursalId === sucursalActivaId).length, color: "text-white", bg: "bg-white/10 border-white/15" },
                { label: "Activos", val: clientes.filter(c => c.estatus === "activo" && (sucursalActivaId === "todos" || c.sucursalId === sucursalActivaId)).length, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
                { label: "Prospectos", val: clientes.filter(c => c.estatus === "prospecto" && (sucursalActivaId === "todos" || c.sucursalId === sucursalActivaId)).length, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
                { label: "Requieren Factura", val: clientes.filter(c => c.requiereFactura && (sucursalActivaId === "todos" || c.sucursalId === sucursalActivaId)).length, color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/20" },
              ].map((kpi) => (
                <div key={kpi.label} className={`flex flex-col items-center px-4 py-3 rounded-xl border ${kpi.bg} min-w-[80px]`}>
                  <p className={`text-xl font-black font-mono ${kpi.color}`}>{kpi.val}</p>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-wider mt-0.5 text-center leading-tight">{kpi.label}</p>
                </div>
              ))}
              {/* Botón Nueva Cliente en el hero */}
              {(usuarioActivo.rol === "admin" || usuarioActivo.rol === "ventas") && (
                <button
                  onClick={handleOpenAdd}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-black py-2 px-4 rounded-xl transition-all shadow-lg shadow-violet-500/25 text-xs uppercase tracking-wider self-center"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Nuevo Cliente
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Input Buscador */}
        <div className="md:col-span-8 relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o RFC fiscal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 focus:outline-none transition-all"
          />
        </div>

        {/* Estatus tabs + Filtro sucursal */}
        <div className="md:col-span-4 flex items-center gap-2">
          <div className="flex flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-xl">
            {["todos", "activo", "prospecto", "inactivo"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 text-[10px] font-black py-1.5 capitalize rounded-lg transition-all ${
                  statusFilter === status
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 rounded-xl shrink-0">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sucursalActivaId}
              onChange={(e) => setSucursalActivaId(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="todos" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Todas</option>
              {sucursales.filter((s) => s.activa).map((s) => (
                <option key={s.id} value={s.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* CORE CONTENIDO: LISTADO Y DETALLES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* TABLA DE CLIENTES (8 columnas en lg) */}
        <div className={`${selectedCliente ? "lg:col-span-8" : "lg:col-span-12"} bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm transition-all duration-300`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-950">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Sucursal</th>
                  <th className="px-6 py-4">Estatus</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {filteredClientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-sm text-zinc-400 font-medium">
                      No se encontraron clientes registrados en este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredClientes.map((cliente) => (
                    <tr
                      key={cliente.id}
                      onClick={() => setSelectedCliente(selectedCliente?.id === cliente.id ? null : cliente)}
                      className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer ${
                        selectedCliente?.id === cliente.id ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar iniciales */}
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-sm shadow-inner shadow-white/20">
                            {cliente.nombre.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                              {cliente.nombre}
                            </p>
                            {cliente.requiereFactura && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-[10px] font-bold text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                                <Receipt className="w-3 h-3" />
                                {cliente.datosFiscales?.rfc}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-0.5">
                          {cliente.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-zinc-400" /> {cliente.email}</p>}
                          {cliente.telefono && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-zinc-400" /> {cliente.telefono}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg">
                          {getSucursalName(cliente.sucursalId)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                          cliente.estatus === "activo"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                            : cliente.estatus === "prospecto"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                        }`}>
                          {cliente.estatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                           {(usuarioActivo.rol === "admin" || usuarioActivo.rol === "ventas") && (
                            <button
                              onClick={(e) => handleOpenEdit(cliente, e)}
                              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {usuarioActivo.rol === "admin" && (
                            <button
                              onClick={(e) => handleDelete(cliente.id, cliente.nombre, e)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-zinc-400" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================================================
            PANEL LATERAL: DETALLES COMPLETOS DEL CLIENTE
            ========================================================================= */}
        {selectedCliente && (
          <div className="lg:col-span-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  Detalles del Cliente
                </p>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
                  {selectedCliente.nombre}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedCliente(null)}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-600 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1"
              >
                Cerrar
              </button>
            </div>

            {/* Ficha rápida */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 shadow-inner">
              <p className="text-xs font-bold text-zinc-400 uppercase">Información de Contacto</p>
              {selectedCliente.email && (
                <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <Mail className="w-4 h-4 text-zinc-400" />
                  <a href={`mailto:${selectedCliente.email}`} className="hover:underline font-medium">{selectedCliente.email}</a>
                </div>
              )}
              {selectedCliente.telefono && (
                <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <Phone className="w-4 h-4 text-zinc-400" />
                  <span className="font-semibold">{selectedCliente.telefono}</span>
                </div>
              )}
              {selectedCliente.whatsapp && (
                <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">WhatsApp</span>
                  <a href={`https://wa.me/52${selectedCliente.whatsapp}`} target="_blank" rel="noreferrer" className="hover:underline font-bold text-emerald-600">{selectedCliente.whatsapp}</a>
                </div>
              )}
            </div>

            {/* Ficha fiscal si aplica */}
            {selectedCliente.requiereFactura && selectedCliente.datosFiscales ? (
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-bold text-zinc-400 uppercase">Datos Fiscales (SAT MX)</p>
                </div>
                
                <div className="text-xs space-y-2">
                  <div>
                    <span className="block text-zinc-400">Razón Social:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedCliente.datosFiscales.razonSocial}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-zinc-400">RFC:</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedCliente.datosFiscales.rfc}</span>
                    </div>
                    <div>
                      <span className="block text-zinc-400">Código Postal:</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{selectedCliente.datosFiscales.codigoPostal}</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-zinc-400">Régimen Fiscal:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {selectedCliente.datosFiscales.regimenFiscal} - {
                        selectedCliente.datosFiscales.regimenFiscal === "601" ? "General de Ley Personas Morales" :
                        selectedCliente.datosFiscales.regimenFiscal === "626" ? "RESICO (Confianza)" : "Sueldos / Actividad Empresarial"
                      }
                    </span>
                  </div>
                  {(selectedCliente.datosFiscales.calle) && (
                    <div>
                      <span className="block text-zinc-400">Dirección Fiscal:</span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {selectedCliente.datosFiscales.calle} #{selectedCliente.datosFiscales.numeroExterior}, Col. {selectedCliente.datosFiscales.colonia}, {selectedCliente.datosFiscales.municipio}, {selectedCliente.datosFiscales.estado}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-100 dark:bg-zinc-950 p-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center">
                <Receipt className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-semibold">Este cliente no solicita facturación fiscal.</p>
              </div>
            )}

            {/* Notas operativas */}
            {selectedCliente.notas && (
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-1 shadow-inner text-xs">
                <span className="block text-zinc-400 font-bold uppercase">Notas Especiales:</span>
                <p className="text-zinc-700 dark:text-zinc-300 italic">{selectedCliente.notas}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL CON FORMULARIO (ALTA / EDICIÓN)
          ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" />
                {editingCliente ? "Editar Expediente de Cliente" : "Registrar Nuevo Cliente"}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Sección 1: Datos de Contacto */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest">1. Datos de Contacto Comercial</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Nombre Comercial / Nombre del Cliente:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Constructora del Norte / Juan Pérez"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Correo Electrónico:</label>
                    <input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Teléfono Fijo / Oficina:</label>
                    <input
                      type="tel"
                      placeholder="10 dígitos"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">WhatsApp Móvil (Instalación/Alertas):</label>
                    <input
                      type="tel"
                      placeholder="10 dígitos"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Estatus inicial:</label>
                    <select
                      value={estatus}
                      onChange={(e) => setEstatus(e.target.value as any)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none"
                    >
                      <option value="prospecto" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Prospecto de Venta</option>
                      <option value="activo" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Cliente Activo</option>
                      <option value="inactivos" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>

              <hr className="border-zinc-200 dark:border-zinc-800" />

              {/* SWITCH FACTURA FISCAL */}
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">¿Requiere Facturación Fiscal?</p>
                    <p className="text-xs text-zinc-400">Si se activa, el SAT solicita validar RFC, Código Postal y Régimen Fiscal CFDI 4.0.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requiereFactura}
                  onChange={(e) => setRequiereFactura(e.target.checked)}
                  className="w-10 h-6 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer relative checked:bg-emerald-600 transition-colors after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform checked:after:translate-x-4 shadow-inner"
                />
              </div>

              {/* Sección 2: Datos Fiscales SAT MX */}
              {requiereFactura && (
                <div className="space-y-4 bg-emerald-50/10 border border-emerald-600/20 p-5 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest">2. Datos de Facturación (CFDI 4.0 SAT)</h4>
                    <button
                      type="button"
                      onClick={fillSampleRfc}
                      className="text-[10px] font-black bg-zinc-100 hover:bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 py-1 px-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 transition-colors"
                    >
                      Autocompletar RFC de Ejemplo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1">Razón Social Oficial (Sin S.A. de C.V.):</label>
                      <input
                        type="text"
                        required={requiereFactura}
                        placeholder="Razón Social como está en CSF"
                        value={razonSocial}
                        onChange={(e) => setRazonSocial(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="block text-xs font-bold text-zinc-400">RFC Fiscal:</label>
                        {rfc && (
                          isRfcValido ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Estructura SAT Válida</span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500"><XCircle className="w-3.5 h-3.5" /> Estructura Inválida</span>
                          )
                        )}
                      </div>
                      <input
                        type="text"
                        required={requiereFactura}
                        placeholder="RFC a 12 o 13 posiciones"
                        value={rfc}
                        onChange={(e) => setRfc(e.target.value.toUpperCase())}
                        className={`w-full bg-white dark:bg-zinc-900 border rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                          rfc && !isRfcValido ? "border-red-500" : "border-zinc-200 dark:border-zinc-800"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1">Código Postal Fiscal:</label>
                      <input
                        type="text"
                        required={requiereFactura}
                        maxLength={5}
                        placeholder="5 dígitos"
                        value={codigoPostal}
                        onChange={(e) => setCodigoPostal(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 mb-1">Régimen Fiscal SAT:</label>
                      <select
                        value={regimenFiscal}
                        onChange={(e) => setRegimenFiscal(e.target.value as RegimenFiscalOption)}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none"
                      >
                        <option value="601" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">601 - General de Ley Personas Morales</option>
                        <option value="626" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">626 - Régimen Simplificado de Confianza (RESICO)</option>
                        <option value="612" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">612 - Personas Físicas con Actividad Empresarial</option>
                        <option value="605" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">605 - Sueldos y Salarios (Físicas)</option>
                      </select>
                    </div>

                    <div className="col-span-2 grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs font-bold text-zinc-400 mb-1">Calle:</label>
                        <input
                          type="text"
                          placeholder="Calle del domicilio fiscal"
                          value={calle}
                          onChange={(e) => setCalle(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1">Num Ext:</label>
                        <input
                          type="text"
                          placeholder="Ext/Int"
                          value={numExt}
                          onChange={(e) => setNumExt(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1">Colonia:</label>
                        <input
                          type="text"
                          placeholder="Colonia"
                          value={colonia}
                          onChange={(e) => setColonia(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1">Municipio/Alcaldía:</label>
                        <input
                          type="text"
                          placeholder="Municipio"
                          value={municipio}
                          onChange={(e) => setMunicipio(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1">Estado:</label>
                        <input
                          type="text"
                          placeholder="Estado"
                          value={estadoDir}
                          onChange={(e) => setEstadoDir(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <hr className="border-zinc-200 dark:border-zinc-800" />

              {/* Sección 3: Notas Operativas */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Notas Internas o Historial de Seguimiento:</label>
                <textarea
                  rows={3}
                  placeholder="Detalla acuerdos de pago, requerimientos de obra especiales, etc."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Botones del Formulario */}
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 py-2.5 px-5 rounded-xl font-bold text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={requiereFactura && !isRfcValido}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm shadow-emerald-500/20 text-sm"
                >
                  {editingCliente ? "Guardar Cambios" : "Dar de Alta"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
