/**
 * Tipos e Interfaces para el Módulo CRM (Gestión de Clientes)
 */

export type RegimenFiscalOption = 
  | "601" // General de Ley Personas Morales
  | "603" // Personas Morales con Fines no Lucrativos
  | "605" // Sueldos y Salarios e Ingresos Asimilados a Salarios
  | "606" // Arrendamiento
  | "612" // Personas Físicas con Actividades Empresariales y Profesionales
  | "621" // Incorporación Fiscal
  | "625" // Régimen de las Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras
  | "626"; // Régimen Simplificado de Confianza (RESICO)

export interface DatosFiscalesMX {
  rfc: string;
  razonSocial: string;
  regimenFiscal: RegimenFiscalOption;
  codigoPostal: string; // Es obligatorio el CP del domicilio fiscal para CFDI 4.0
  calle?: string;
  numeroExterior?: string;
  numeroInterior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
}

export interface Cliente {
  id: string;
  sucursalId: string; // Aislamiento multi-sucursal
  nombre: string; // Nombre comercial o nombre de pila para CRM rápido
  email?: string;
  telefono?: string;
  whatsapp?: string;
  datosFiscales?: DatosFiscalesMX;
  requiereFactura: boolean;
  notas?: string;
  estatus: "prospecto" | "activo" | "inactivo";
  createdAt: string;
}
