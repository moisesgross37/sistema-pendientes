// frontend/src/components/Dashboard.tsx
// ARCHIVO COMPLETO Y ACTUALIZADO
// Incluye la lógica para subir archivos por cada caso.

import { useState, useEffect, useRef } from 'react';
import type { AppView } from '../App'; // <--- AÑADIR ESTO
import { jwtDecode } from 'jwt-decode';
import {
  Button,
  Table,
  Form,
  Modal,
  Card,
  Alert,
  Row,
  Col,
  Badge,
  ListGroup,
  Tabs,
  Tab,
  Spinner, // <--- 1. IMPORTACIÓN NUEVA
} from 'react-bootstrap';

// --- Constante de la URL de la API (para desarrollo local) ---
const API_URL = import.meta.env.VITE_API_URL;

// --- Interfaces ---

// Nueva interfaz para un Caso (sub-tarea)
interface Caso {
  id: number;
  descripcion: string;
  // status: string; // <--- ELIMINADO
  estado: EstadoCaso; // <--- AÑADIDO (Ahora usa la interfaz que ya cargamos)
  imagenes: string[];
  fechaCreacion: Date;
  comentario: string | null;
  archivoUrl?: string;
  pendiente?: any;
}

// Interfaz actualizada del Pendiente (ahora un "Proyecto")
interface Pendiente {
  id: number;
  fechaCreacion: string;
  fechaAsignacion: string | null;
  fechaConclusion: string | null;
  nombreCentro: string;
  status: string;
  asesor: Usuario;
  colaboradorAsignado?: Usuario | null;
  casos: Caso[]; // <--- NUEVO: Un Pendiente ahora tiene un array de Casos
  historial?: { 
    fecha: string; 
    autor: string; 
    accion: string; 
    nota: string; 
  }[];
}

interface Usuario {
  id: number;
  username: string;
  rol: string;
}

interface DecodedToken {
  sub: number;
  username: string;
  rol: string;
}

interface DashboardProps {
  token: string;
  setView: (view: AppView) => void; // <--- USAMOS EL TIPO IMPORTADO
}
interface EstadoCaso {
  id: number;
  nombre: string;
  color: string;
  requiereComentario: boolean;
}
// --- 2. INTERFAZ NUEVA PARA EL ESTADO DEL FORMULARIO ---
// Define cómo se ve un "caso" en el formulario de creación,
// antes de que se suban los archivos.
interface NewCasoState {
  descripcion: string;
  files: File[]; // Guardará los archivos seleccionados
}

// --- Componente ---
function Dashboard({ token, setView }: DashboardProps) {
  // 1. Estados Generales
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [pendientesFiltrados, setPendientesFiltrados] = useState<Pendiente[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
// 1. Para capturar el cambio de estado
  const [nuevoEstadoCaso, setNuevoEstadoCaso] = useState<Record<number, number>>({});
  
  // 2. Para capturar el texto de respuesta del colaborador
  const [comentarioEdicion, setComentarioEdicion] = useState<Record<number, string>>({});
  
  // 3. NUEVO: Para capturar la foto que suban (antes de enviarla)
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<Record<number, File | null>>({});
  // 2. 🏆 RELOJ DEL TORNEO (Aquí está la clave, una sola vez)
  const [rankingStartDate, setRankingStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [rankingEndDate, setRankingEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // 3. Estados del Modal de Creación
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNombreCentro, setNewNombreCentro] = useState('');
  const [nuevoArea, setNuevoArea] = useState('');
  const [newCasos, setNewCasos] = useState<NewCasoState[]>([
    { descripcion: '', files: [] },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4. Estados del Modal de Actualización
  const [editingPendiente, setEditingPendiente] = useState<Pendiente | null>(null);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>('');

  // 5. Estados de Filtros y Usuarios
  const [allUsers, setAllUsers] = useState<Usuario[]>([]);
  const [colaboradores, setColaboradores] = useState<Usuario[]>([]);
  const [filtroAsesor, setFiltroAsesor] = useState('');
  const [filtroAsignado] = useState<string>(''); // Mantenemos esto como lo tenías
  const [filtroDias, setFiltroDias] = useState('');

  // 6. Estados de Visualización (Detalles e Imágenes)
  const [viewingImages, setViewingImages] = useState<string[] | null>(null);
  const [viewingProyecto, setViewingProyecto] = useState<Pendiente | null>(null);
  const [editableCasos, setEditableCasos] = useState<Caso[]>([]);
  const [deletingPendiente, setDeletingPendiente] = useState<Pendiente | null>(null);
  const [notaTransferencia, setNotaTransferencia] = useState('');

  // ==============================================================
  // 1. FUNCIÓN FETCH PENDIENTES (Con Auto-Logout)
  // ==============================================================
  const fetchPendientes = async (role: string) => {
    let endpointUrl = '';

    switch (role) {
      case 'Administrador':
      case 'Coordinador': // 👈 ¡AGREGAMOS ESTO AQUÍ!
        // Al ponerlo así, ambos roles descargarán la lista COMPLETA
        endpointUrl = `${API_URL}/pendientes`;
        break;
      case 'Asesor':
        endpointUrl = `${API_URL}/pendientes/mis-proyectos`;
        break;
      case 'Colaborador':
        endpointUrl = `${API_URL}/pendientes/mis-asignaciones`;
        break;
      default:
        // Si no hay rol claro, no hacemos fetch
        return;
    }

    try {
      const token = localStorage.getItem('authToken'); // Usamos authToken
      
      // Si no hay token, no intentamos fetch, el useEffect lo manejará
      if (!token) return; 

      const response = await fetch(endpointUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 🛡️ SEGURIDAD: Si el token venció, expulsar
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'No se pudo obtener la lista.');
      }
      
      const data = await response.json();
      setPendientes(data);
      // Si usas filtros, actualízalos también:
      setPendientesFiltrados(data); 

    } catch (err: any) {
      console.error(err);
      // Opcional: setError(err.message);
    }
  };

  // ==============================================================
  // 2. FUNCIÓN FETCH USERS (Con Auto-Logout)
  // ==============================================================
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const res = await fetch(`${API_URL}/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 🛡️ SEGURIDAD: Si el token venció, expulsar
      if (res.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
        return;
      }

      if (!res.ok) {
        console.warn('No se pudieron cargar usuarios');
        return;
      }

      const usersData = await res.json();
      setAllUsers(usersData);
      
      const collabUsers = usersData.filter(
        (user: Usuario) => user.rol === 'Colaborador' || user.rol === 'Coordinador',
      );
      setColaboradores(collabUsers);

    } catch (err: any) {
      console.error(err.message);
    }
  };

  // ==============================================================
  // 3. USE EFFECT PRINCIPAL (Carga Inicial Corregida)
  // ==============================================================
  useEffect(() => {
    const token = localStorage.getItem('authToken'); 

    if (token) {
      try {
        const decodedToken: DecodedToken = jwtDecode(token);
        setUserRole(decodedToken.rol);
        
        // 1. Cargar Pendientes (Según el rol)
        fetchPendientes(decodedToken.rol || '');

        // 2. Cargar Usuarios (PARA TODOS)
        // 👇 CAMBIO AQUÍ: Quitamos el 'if (admin)' para que Rashell vea las pestañas
        fetchUsers(); 
        // 👆 Ahora todos pueden ver la lista de colaboradores para filtrar

      } catch (error) {
        console.error('Error decodificando token:', error);
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    } 
    // Nota: Si no hay token, simplemente no carga nada (o redirige si activas la linea de abajo)
    // else { window.location.href = '/login'; }
  }, []);
  // ==============================================================
  // ================================================================
  // ===== 🚀 LÓGICA DEL NUEVO FORMULARIO DE CREACIÓN 🚀 =====
  // ================================================================

  // Actualiza la descripción del caso
  const handleCasoChange = (index: number, value: string) => {
    const updatedCasos = [...newCasos];
    updatedCasos[index].descripcion = value;
    setNewCasos(updatedCasos);
  };

  // Añade un nuevo caso vacío al formulario
  const handleAddCaso = () => {
    setNewCasos([...newCasos, { descripcion: '', files: [] }]);
  };

  // Elimina un caso del formulario
  const handleRemoveCaso = (index: number) => {
    const updatedCasos = newCasos.filter((_, i) => i !== index);
    setNewCasos(updatedCasos);
  };

  // --- 5. NUEVA FUNCIÓN: Maneja la selección de archivos para UN caso ---
  const handleCasoFileChange = (
    casoIndex: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const updatedCasos = [...newCasos];
      // Añade los nuevos archivos a los ya existentes para ese caso
      updatedCasos[casoIndex].files.push(...newFiles);
      setNewCasos(updatedCasos);

      // Limpia el input para permitir seleccionar el mismo archivo de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // --- 6. NUEVA FUNCIÓN: Elimina un archivo seleccionado de UN caso ---
  const handleRemoveCasoFile = (casoIndex: number, fileIndex: number) => {
    const updatedCasos = [...newCasos];
    // Filtra el array de archivos del caso específico
    updatedCasos[casoIndex].files = updatedCasos[casoIndex].files.filter(
      (_, i) => i !== fileIndex,
    );
    setNewCasos(updatedCasos);
  };

  // Resetea y cierra el modal de creación
  const handleCloseCreateModal = () => {
    setShowCreateForm(false);
    setNewNombreCentro('');
    setNewCasos([{ descripcion: '', files: [] }]);
    setNuevoArea('');
    setError('');
    setSuccess('');
    setIsLoading(false);
  };

  // --- 7. FUNCIÓN DE ENVÍO (Submit) - CON SOPORTE PARA ÁREAS ---
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validación básica
    if (newCasos.some((caso) => caso.descripcion.trim() === '')) {
      setError('Todos los casos deben tener una descripción.');
      setIsLoading(false);
      return;
    }

    try {
      // Array para los datos finales de los casos
      const casosParaEnviar: { descripcion: string; imagenes: string[] }[] = [];

      // --- PASO A: Subir archivos ---
      for (const caso of newCasos) {
        let nombresDeArchivosSubidos: string[] = [];

        if (caso.files.length > 0) {
          const formData = new FormData();
          caso.files.forEach((file) => {
            formData.append('files', file);
          });

          const uploadRes = await fetch(`${API_URL}/casos/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });

          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) {
            throw new Error(
              uploadData.message || 'Falló la subida de uno o más archivos.',
            );
          }
          
          nombresDeArchivosSubidos = uploadData.map(
            (file: any) => file.fileName,
          );
        }

        casosParaEnviar.push({
          descripcion: caso.descripcion,
          imagenes: nombresDeArchivosSubidos,
        });
      }

      // --- PASO B: Crear el Proyecto (Pendiente) ---
      const decodedToken: DecodedToken = jwtDecode(token);
      const asesorId = decodedToken.sub;

      const body = {
        nombreCentro: newNombreCentro,
        // 👇 AQUÍ ESTÁ EL CAMBIO IMPORTANTE 👇
        area: nuevoArea, // Enviamos el área seleccionada (si está vacía, envía "")
        // 👆 ------------------------------- 👆
        asesorId: asesorId,
        casos: casosParaEnviar,
      };

      const response = await fetch(`${API_URL}/pendientes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo crear el proyecto.');
      }

      setSuccess('¡Proyecto y casos creados con éxito!');
      
      // IMPORTANTE: Asegúrate de que handleCloseCreateModal también limpie 'setNuevoArea("")'
      handleCloseCreateModal(); 
      
      if (userRole) fetchPendientes(userRole);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  // ================================================================
  // ===== 🚀 LÓGICA DE MODAL DE DETALLES (ACTUALIZAR CASO) 🚀 =====
  // ================================================================

  // (Esta es la lógica que ya habíamos construido)

  // --- FUNCIÓN ACTUALIZADA PARA SUBIR FOTOS Y TEXTO ---
  const handleUpdateCaso = async (casoId: number) => {
    setError('');
    setSuccess('');
    
    // 1. Recopilamos los datos específicos de este caso usando su ID
    const estadoId = nuevoEstadoCaso[casoId];
    const textoRespuesta = comentarioEdicion[casoId] || ''; 
    const archivo = archivosAdjuntos[casoId];

    // Validación: El estado es obligatorio para saber qué pasó
    if (!estadoId) {
        alert("⚠️ Por favor selecciona un Nuevo Estado antes de guardar.");
        return;
    }

    setIsLoading(true);

    try {
      // 2. Preparamos el "Sobre" (FormData) para enviar archivo + texto
      const formData = new FormData();
      formData.append('estadoId', String(estadoId));
      formData.append('comentario', textoRespuesta);
      
      // Solo metemos la foto al sobre si el usuario subió una
      if (archivo) {
        formData.append('file', archivo); 
      }

      // 3. Enviamos a la API
      // NOTA: Al usar FormData, NO ponemos 'Content-Type': 'application/json'
      const res = await fetch(`${API_URL}/casos/${casoId}`, { 
        method: 'PATCH', // (Asegúrate que tu backend usa PATCH, si no cámbialo a PUT)
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData, 
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'No se pudo actualizar el caso.');
      }

      // 4. ¡Éxito! Limpiamos los formularios
      setSuccess(`¡Respuesta del caso #${casoId} enviada correctamente! 🚀`);
      
      // Borramos la foto y el comentario de la memoria para que quede limpio
      setArchivosAdjuntos(prev => {
          const copy = { ...prev };
          delete copy[casoId];
          return copy;
      });
      setComentarioEdicion(prev => {
          const copy = { ...prev };
          delete copy[casoId];
          return copy;
      });
      // Reseteamos el selector de estado
      setNuevoEstadoCaso(prev => {
          const copy = { ...prev };
          delete copy[casoId];
          return copy;
      });

      // Recargamos la lista de proyectos para ver los cambios reflejados
      // (Asegúrate de llamar a la función correcta que recarga tus datos)
       if (userRole) fetchPendientes(userRole); // O fetchPendientes() si no usa rol

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };
// Esta función se llama desde el botón "Finalizar Proyecto"
// Llama a la API de 'pendientes' (PATCH) para cambiar el estado.
const handleMarkAsConcluido = async () => {
  if (!viewingProyecto) return; // Seguridad

  setError('');
  setSuccess('');
  setIsLoading(true);

  const proyectoId = viewingProyecto.id;

  try {
    // Usamos la misma ruta de 'actualizar' que ya teníamos,
    // pero solo para enviar el nuevo estado.
    const res = await fetch(`${API_URL}/pendientes/${proyectoId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'Concluido', // <-- El cambio clave
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'No se pudo finalizar el proyecto.');
    }

    setSuccess(`¡Proyecto #${proyectoId} marcado como Concluido!`);

    // Cerramos el modal de detalles
    setViewingProyecto(null);
    setEditableCasos([]);

    // Recargamos la lista (el proyecto se moverá a la tabla de 'Concluidos')
    if (userRole) fetchPendientes(userRole);

  } catch (err: any) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
// --- 👇 AÑADE ESTA NUEVA FUNCIÓN AQUÍ ---

// --- 👇 REEMPLAZA ESTA FUNCIÓN COMPLETA ---

/**
 * Esta función "inteligente" calcula un estado de resumen para el PROYECTO
 * basándose en el estado de sus CASOS hijos.
 * * VERSIÓN 2.0: Toma el color directamente del 'caso' encontrado, 
 * evitando problemas de caché con la lista 'estadosCaso'.
 */
// --- 👇 REEMPLAZA ESTA FUNCIÓN COMPLETA ---

/**
 * Esta función "inteligente" calcula un estado de resumen para el PROYECTO
 * basándose en el estado de sus CASOS hijos.
 * * VERSIÓN 2.0: Toma el color directamente del 'caso' encontrado, 
 * evitando problemas de caché con la lista 'estadosCaso'.
 */
const getResumenEstadoProyecto = (
  proyectoStatus: string, // El estado logístico (ej: "Por Asignar")
  casos: Caso[],          // La lista de casos hijos
): { nombre: string; color: string } => {

  // 1. Los estados logísticos tienen prioridad.
  if (proyectoStatus === 'Por Asignar') {
    return { nombre: 'Por Asignar', color: '#6c757d' }; // Gris
  }
  if (proyectoStatus === 'Concluido') {
    return { nombre: 'Concluido', color: '#28a745' }; // Verde
  }
  // Si no hay casos, mostramos el estado logístico
  if (!casos || casos.length === 0) {
    return { nombre: proyectoStatus, color: '#343a40' }; // Oscuro
  }

  // 3. Lógica de monitoreo (Corregida):

  // PRIORIDAD MÁXIMA: Si CUALQUIER caso está "Detenido"
  // (Usamos 'find' para obtener el caso y su color)
  const casoDetenido = casos.find((c) => c.estado?.nombre === 'Detenido');
  if (casoDetenido) {
    // ¡Usamos el color DEL CASO, no de la lista 'estadosCaso'!
    return { nombre: 'Detenido', color: casoDetenido.estado.color }; 
  }

  // PRIORIDAD 2: Si TODOS los casos están "Resueltos"
  // (Usamos 'find' solo para obtener un color de muestra)
  const casoResuelto = casos.find((c) => c.estado?.nombre === 'Resuelto');
  if (casos.every((c) => c.estado?.nombre === 'Resuelto')) {
    return { nombre: 'Resuelto (Listo)', color: casoResuelto?.estado.color || '#28a745' };
  }

  // PRIORIDAD 3: Si CUALQUIER caso está "En Proceso"
  const casoEnProceso = casos.find((c) => c.estado?.nombre === 'En Proceso');
  if (casoEnProceso) {
    return { nombre: 'En Proceso', color: casoEnProceso.estado.color };
  }

  // PRIORIDAD 4 (Default): Si todos son "Pendiente"
  const casoPendiente = casos.find((c) => c.estado?.nombre === 'Pendiente');
  return { 
    nombre: 'Pendiente', 
    color: casoPendiente?.estado.color || '#888888' 
  };
};
// --- 👆 ---
// --- 👆 ---
// --- 👆 ---
  // ================================================================
  // ===== 🚀 LÓGICA DE MODAL DE ACTUALIZAR PROYECTO 🚀 =====
  // ================================================================
  
  // (Esta lógica se mantiene intacta)

  const handleOpenUpdateModal = (pendiente: Pendiente) => {
    setEditingPendiente(pendiente);
    setSelectedColaboradorId(
      pendiente.colaboradorAsignado?.id.toString() || '',
    );
  };

  // Función para guardar la asignación (Modal Pequeño) - CORREGIDA
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPendiente) return;

    // 👇 AQUÍ ESTABA EL ERROR: Tu llave se llama 'authToken', no 'token'
    const token = localStorage.getItem('authToken'); 
    
    if (!token) {
        alert("⚠️ No se encontró el token de sesión. Por favor relogueate.");
        return;
    }

    try {
      // Preparamos el paquete
      const payload: any = {};
      
      if (selectedColaboradorId) {
        payload.colaboradorAsignadoId = Number(selectedColaboradorId);
      } else {
        payload.colaboradorAsignadoId = null;
      }

      // Usamos FETCH con la llave correcta
      const response = await fetch(`${API_URL}/pendientes/${editingPendiente.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Ahora sí enviamos el authToken real
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 401) {
            alert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
            return;
        }
        throw new Error('Error al conectar con el servidor');
      }

      // ✅ ÉXITO
      setEditingPendiente(null); // 1. Cerramos la ventana
      
      // 2. Recargamos la tabla de afuera inmediatamente
      await fetchPendientes(userRole || ''); 

    } catch (error) {
      console.error(error);
      alert('Error actualizando el proyecto. Revisa la consola.');
    }
  };
// --- FUNCIÓN DE TRANSFERENCIA RÁPIDA (DENTRO DEL MISMO MODAL) ---
  const handleQuickTransfer = async () => {
    if (!viewingProyecto || !selectedColaboradorId) {
        alert("Por favor selecciona a quién le vas a pasar el proyecto.");
        return;
    }

    // Confirmación de seguridad
    const confirm = window.confirm("¿Estás seguro de transferir este proyecto? Desaparecerá de tu lista.");
    if (!confirm) return;

    setIsLoading(true);
    const token = localStorage.getItem('authToken');

    try {
      const res = await fetch(`${API_URL}/pendientes/${viewingProyecto.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            colaboradorAsignadoId: Number(selectedColaboradorId),
            // Opcional: Si quieres que al transferir se cambie el estado a algo neutro
            // status: 'Iniciado' 
        })
      });

      if (!res.ok) throw new Error('Error al transferir el proyecto');

      setSuccess(`¡Proyecto transferido exitosamente! 🚀`);
      
      // Cerramos todo
      setViewingProyecto(null);
      setEditableCasos([]);
      setSelectedColaboradorId(''); // Limpiamos la selección
      
      // Recargamos la lista
      if (userRole) fetchPendientes(userRole);

    } catch (error) {
      console.error(error);
      alert('Error al transferir. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };
  // --- FUNCIÓN DE TRANSFERENCIA CON NOTA (Bitácora) ---
  const handleQuickTransferWithNote = async () => {
    if (!viewingProyecto || !selectedColaboradorId) {
        alert("⚠️ Por favor selecciona a quién le vas a pasar el proyecto.");
        return;
    }
    if (!notaTransferencia.trim()) {
        alert("⚠️ La 'Nota de Entrega' es obligatoria. Escribe qué estás entregando.");
        return;
    }

    const confirm = window.confirm(`¿Transferir proyecto y guardar nota en el historial?`);
    if (!confirm) return;

    setIsLoading(true);
    const token = localStorage.getItem('authToken');

    try {
      // Enviamos ID, la Nota y (opcionalmente) status
      const res = await fetch(`${API_URL}/pendientes/${viewingProyecto.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            colaboradorAsignadoId: Number(selectedColaboradorId),
            notaTransferencia: notaTransferencia // <--- Aquí va la nota al backend
        })
      });

      if (!res.ok) throw new Error('Error al transferir el proyecto');

      setSuccess(`¡Transferencia exitosa! Se guardó en el historial. 📜`);
      
      // Limpieza total
      setViewingProyecto(null);
      setEditableCasos([]);
      setSelectedColaboradorId('');
      setNotaTransferencia(''); // Limpiamos la nota
      
      // Recarga
      if (userRole) fetchPendientes(userRole);

    } catch (error) {
      console.error(error);
      alert('Error al transferir. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };
  // --- FUNCIÓN PARA IMPRIMIR COMPROBANTE (VERSIÓN FINAL V3 - SOPORTE PDF) ---
  const handlePrintReceipt = () => {
    if (!viewingProyecto) return;

    // 1. Recopilar todas las imágenes de todos los casos
    const todasLasEvidencias: string[] = [];
    viewingProyecto.casos.forEach(caso => {
        if (caso.imagenes && caso.imagenes.length > 0) {
            todasLasEvidencias.push(...caso.imagenes);
        }
    });

    // 2. Abrir ventana nueva
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        alert("El navegador bloqueó la ventana emergente. Por favor permítela.");
        return;
    }

    // URL Base para imágenes
    const baseUrl = window.location.origin; // O usa API_URL si las imágenes vienen directo del backend

    // 3. Escribir el HTML
    printWindow.document.write(`
      <html>
        <head>
          <title>Comprobante de Entrega #${viewingProyecto.id}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #0d6efd; padding-bottom: 10px; margin-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #0d6efd; text-transform: uppercase; }
            .title { font-size: 18px; margin-top: 10px; font-weight: bold; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .label { font-weight: bold; font-size: 12px; color: #666; text-transform: uppercase; }
            .value { font-size: 14px; margin-bottom: 5px; }
            .section-title { font-size: 14px; font-weight: bold; background: #f0f0f0; padding: 5px 10px; margin-top: 20px; border-left: 4px solid #0d6efd; }
            
            .images-container { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 15px; }
            .img-box { 
                border: 1px solid #ccc; 
                padding: 10px; 
                border-radius: 4px; 
                width: 160px; 
                height: 190px;
                text-align: center; 
                background-color: #fff;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .img-box img { 
                width: 140px; height: 140px; 
                object-fit: cover; 
                border: 1px solid #eee;
            }
            /* Estilo para el icono de PDF/Documento */
            .doc-icon {
                font-size: 48px; color: #dc3545; font-weight: bold;
                border: 2px solid #dc3545; border-radius: 5px;
                width: 80px; height: 100px;
                display: flex; align-items: center; justify-content: center;
                margin-bottom: 10px;
            }
            .img-label { font-size: 11px; color: #888; margin-top: 5px; font-weight: bold; word-break: break-all; }

            .signatures { margin-top: 80px; display: flex; justify-content: space-between; }
            .sig-line { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 10px; font-size: 12px; }
            .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
              .img-box { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          
          <div class="header">
            <div class="logo">BE EVENTOS</div>
            <div class="title">Comprobante de Entrega de Trabajo</div>
          </div>

          <div class="info-grid">
            <div><div class="label">ID Proyecto</div><div class="value">#${viewingProyecto.id}</div></div>
            <div><div class="label">Fecha Entrega</div><div class="value">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div></div>
            <div><div class="label">Centro / Cliente</div><div class="value"><strong>${viewingProyecto.nombreCentro}</strong></div></div>
            <div><div class="label">Estado Final</div><div class="value">${viewingProyecto.status}</div></div>
            <div><div class="label">Asesor</div><div class="value">${viewingProyecto.asesor.username}</div></div>
            <div><div class="label">Entregado por</div><div class="value">${viewingProyecto.colaboradorAsignado?.username || 'Administración'}</div></div>
          </div>

          <div class="section-title">EVIDENCIA DOCUMENTAL</div>
          <p style="font-size: 12px; color: #666;">Documentos y archivos adjuntos entregados:</p>

          <div class="images-container">
            ${todasLasEvidencias.length > 0 
                ? todasLasEvidencias.map((archivo, i) => {
                    // Detectar si es PDF
                    const esPdf = archivo.toLowerCase().endsWith('.pdf');
                    // Usar URL absoluta al backend
                    const fileUrl = `${API_URL}/uploads/${archivo}`;

                    if (esPdf) {
                        return `
                        <div class="img-box">
                            <div class="doc-icon">PDF</div>
                            <div class="img-label">Documento ${i+1}</div>
                        </div>`;
                    } else {
                        return `
                        <div class="img-box">
                            <img src="${fileUrl}" alt="Evidencia" onerror="this.src='https://via.placeholder.com/150?text=Error';" />
                            <div class="img-label">Imagen ${i+1}</div>
                        </div>`;
                    }
                  }).join('')
                : '<p><em>No hay archivos adjuntos.</em></p>'
            }
          </div>

          <div class="signatures">
            <div class="sig-line"><strong>ENTREGADO POR</strong><br/>Firma y Sello</div>
            <div class="sig-line"><strong>RECIBIDO CONFORME</strong><br/>Firma del Asesor / Cliente</div>
          </div>

          <div class="footer">
            Documento generado el ${new Date().toLocaleString()}.
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 1000); }
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };
  // Esta función AHORA es llamada por el botón "Confirmar"
// en el nuevo modal de borrado.
const handleDeletePendiente = async () => {
  // 1. Comprobar que haya un proyecto seleccionado para borrar
  if (!deletingPendiente) return; 

  const id = deletingPendiente.id; // 2. Obtenemos el ID desde el estado

  // 3. Limpiamos cualquier error "fantasma" anterior
  setError('');
  setSuccess('');
  setIsLoading(true); // 4. Activamos el spinner

  try {
    const res = await fetch(`${API_URL}/pendientes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(
        errorData.message || 'No se pudo eliminar el proyecto.',
      );
    }

    setSuccess(`Proyecto #${id} eliminado con éxito.`);
    if (userRole) fetchPendientes(userRole);

  } catch (err: any) {
    // Si la API falla (ej: error 409 por dependencias), 
    // mostramos el error en el banner principal.
    setError(err.message);

  } finally {
    // 5. Pase lo que pase (éxito o error), cerramos el modal
    setDeletingPendiente(null); 
    setIsLoading(false); // Desactivamos el spinner
  }
};
  
  // ================================================================
  // ===== 🚀 LÓGICA DE FILTROS Y VISTAS 🚀 =====
  // ================================================================

  // (Toda esta sección se mantiene intacta)

  const filteredPendientes = pendientes.filter((p) => {
    if (filtroAsesor && p.asesor.id !== parseInt(filtroAsesor)) return false;
    if (filtroAsignado) {
      if (filtroAsignado === 'ninguno' && p.colaboradorAsignado) return false;
      if (
        filtroAsignado !== 'ninguno' &&
        p.colaboradorAsignado?.id !== parseInt(filtroAsignado)
      )
        return false;
    }
    if (filtroDias) {
      const fechaCreacion = new Date(p.fechaCreacion);
      const hoy = new Date();
      fechaCreacion.setHours(0, 0, 0, 0);
      hoy.setHours(0, 0, 0, 0);
      const diffTiempo = hoy.getTime() - fechaCreacion.getTime();
      const diffDias = Math.ceil(diffTiempo / (1000 * 3600 * 24));
      if (filtroDias === '0-4' && diffDias >= 5) return false;
      if (filtroDias === '5-9' && (diffDias < 5 || diffDias >= 10)) return false;
      if (filtroDias === '10+' && diffDias < 10) return false;
    }
    return true;
  });

  const pendientesActivos = filteredPendientes.filter(
    (p) => p.status !== 'Concluido',
  );
  const pendientesConcluidos = filteredPendientes.filter(
    (p) => p.status === 'Concluido',
  );
  // ================================================================
  // ===== 🚀 FUNCIÓN DE RENDERIZADO DE TABLA (ACTUALIZADA) 🚀 =====
  // ================================================================

  // (Esta función se mantiene intacta, con los botones que ya corregimos)

  const renderPendientesTable = (
    pendientesFiltrados: Pendiente[],
    showFilters: boolean = false,
  ) => (
    <>
      {showFilters && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Filtros</Card.Title>
            <Form>
              <Row>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Filtrar por Asesor</Form.Label>
                    <Form.Select
                      value={filtroAsesor}
                      onChange={(e) => setFiltroAsesor(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {[
                        ...new Map(
                          pendientes.map((p) => [p.asesor.id, p.asesor]),
                        ).values(),
                      ].map((asesor) => (
                        <option key={asesor.id} value={asesor.id}>
                          {asesor.username}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Filtrar por Días</Form.Label>
                    <Form.Select
                      value={filtroDias}
                      onChange={(e) => setFiltroDias(e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="0-4">Menos de 5 días (Normal)</option>
                      <option value="5-9">Entre 5 y 9 días (Urgente)</option>
                      <option value="10+">10 días o más (Crítico)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha Creación</th>
            <th>Días Transcurridos</th>
            <th>Centro (Proyecto)</th>
            <th>Asesor</th>
            <th>Casos (Sub-tareas)</th>
            <th>Asignado a</th>
            <th>Fecha Asignación</th>
            <th>Estado</th>
            {/* --- 👇 LÍNEA MODIFICADA --- */}
            {userRole === 'Administrador' && (
              <th>Acciones</th>
            )}
            {/* --- 👆 --- */}
          </tr>
        </thead>
        {/* --- 👇 REEMPLAZA ESTE BLOQUE 'tbody' COMPLETO --- */}
        <tbody>
          {pendientesFiltrados.map((p) => {
            // --- Cálculos existentes ---
            const fechaCreacion = new Date(p.fechaCreacion);
            const hoy = new Date();
            const diffTiempo = hoy.getTime() - fechaCreacion.getTime();
            const diffDias = Math.ceil(diffTiempo / (1000 * 3600 * 24));
            let diasColor = '';
            if (diffDias >= 10) diasColor = '#ffcccb';
            else if (diffDias >= 5) diasColor = '#ffebcc';
            else diasColor = '#d4edda';

            // --- 👇 1. LLAMAMOS A LA NUEVA FUNCIÓN "INTELIGENTE" ---
            const resumen = getResumenEstadoProyecto(p.status, p.casos);
            // --- 👆 ---

            return (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{new Date(p.fechaCreacion).toLocaleDateString()}</td>
                <td style={{ backgroundColor: diasColor, fontWeight: 'bold' }}>
                  {diffDias}
                </td>
                <td>{p.nombreCentro}</td>
                <td>{p.asesor.username}</td>
                <td>
                  {/* Botón "Ver (X)" */}
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => {
                      setError('');
                      setViewingProyecto(p);
                      // Hacemos la copia profunda para el modal
                      setEditableCasos(JSON.parse(JSON.stringify(p.casos)).map((c: Caso) => ({ ...c, error: null })));
                    }}
                  >
                    Ver ({p.casos.length})
                  </Button>
                </td>
                <td>
                  {p.colaboradorAsignado ? (
                    p.colaboradorAsignado.username
                  ) : (
                    <span style={{ color: '#888' }}>No asignado</span>
                  )}
                </td>
                <td>
                  {p.fechaAsignacion
                    ? new Date(p.fechaAsignacion).toLocaleDateString()
                    : '-'}
                </td>

                {/* --- 👇 2. AQUÍ ESTÁ EL CAMBIO VISUAL --- */}
                <td>
                  <Badge
                    style={{
                      backgroundColor: resumen.color,
                      // Añadimos un color de texto que contraste (blanco)
                      color: '#fff', 
                    }}
                    className="p-2 w-100" // Ocupa todo el ancho de la celda
                  >
                    {resumen.nombre}
                  </Badge>
                </td>
                {/* --- 👆 --- */}
{userRole === 'Administrador' && (
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleOpenUpdateModal(p)}
                      className="me-2"
                    >
                      Actualizar
                    </Button>
                    {userRole === 'Administrador' && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => setDeletingPendiente(p)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        {/* --- 👆 --- */}
      </Table>

      {pendientesFiltrados.length === 0 && (
        <Alert variant="info">No hay proyectos para mostrar en esta vista.</Alert>
      )}
    </>
  );

  // ================================================================
  // ===== 🚀 INICIO DEL RENDERIZADO JSX 🚀 =====
  // ================================================================

  return (
    <div>
      {/* Botón Admin y Cabecera */}
      {userRole === 'Administrador' && (
        <Button
          variant="secondary"
          onClick={() => setView('admin')}
          className="mb-3"
        >
          Gestionar Usuarios
        </Button>
      )}
      <h2>Dashboard Principal</h2>
      <p>
        ¡Bienvenido! Has iniciado sesión como: <strong>{userRole}</strong>
      </p>
      <hr />

      {/* Alertas Globales de Error y Éxito */}
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess('')} dismissible>
          {success}
        </Alert>
      )}
<hr /> {/* Separador */}
{/* ================================================================ */}
      {/* ===== 🏆 TABLA DE COMPETENCIA MENSUAL (AUTO-ACTUALIZABLE) 🏆 ===== */}
      {/* ================================================================ */}
      {(userRole === 'Administrador' || userRole === 'Colaborador') && (
        <Card className="mb-4 shadow border-0">
          <Card.Header className="bg-white border-bottom-0 pt-4 pb-0">
            <div className="d-flex justify-content-between align-items-end flex-wrap gap-3">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span style={{fontSize: '1.8rem'}}>🏆</span>
                  <h3 className="mb-0 fw-bold text-primary">Competencia del Mes</h3>
                </div>
                <p className="text-muted mb-0 ms-1">
                  Ranking de productividad en tiempo real.
                </p>
              </div>
              
              {/* Filtros de Fecha */}
              <div className="d-flex gap-2 align-items-center bg-light p-2 rounded border">
                <small className="fw-bold text-secondary text-uppercase" style={{fontSize:'0.7rem'}}>Periodo:</small>
                <Form.Control 
                  type="date" 
                  size="sm"
                  value={rankingStartDate}
                  onChange={(e) => setRankingStartDate(e.target.value)}
                  style={{ width: '130px', fontSize: '0.85rem' }}
                />
                <span className="text-muted fw-bold">-</span>
                <Form.Control 
                  type="date" 
                  size="sm"
                  value={rankingEndDate}
                  onChange={(e) => setRankingEndDate(e.target.value)}
                  style={{ width: '130px', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </Card.Header>
          
          <Card.Body className="pt-2">
            {(() => {
              // --- 1. LÓGICA DE CÁLCULO SEGURA (BLINDADA CONTRA ERRORES) ---
              
              // Protección 1: Aseguramos que pendientes sea un array
              const listaSegura = Array.isArray(pendientes) ? [...pendientes] : [];

             // --- 2. FILTRO Y ACUMULACIÓN (VERSIÓN COMPARACIÓN DE TEXTO) ---
              const statsObj = listaSegura.reduce((acc: any, p: any) => {
                
                // FUNCIÓN AUXILIAR: Normalizar todo a "AAAA-MM-DD"
                // Esto elimina problemas de horas, minutos y zonas horarias.
                const normalizarFecha = (fecha: string | Date | null) => {
                    if (!fecha) return "0000-00-00";
                    
                    // Si ya es string
                    let fStr = String(fecha);
                    
                    // Caso 1: Formato Latino "20/11/2025" (El que tienes en tu tabla)
                    if (fStr.includes('/') && fStr.length === 10) {
                        const [dia, mes, anio] = fStr.split('/');
                        return `${anio}-${mes}-${dia}`; // Retorna "2025-11-20"
                    }
                    
                    // Caso 2: Formato ISO "2025-11-20T15:30:00..."
                    if (fStr.includes('T')) {
                        return fStr.split('T')[0];
                    }
                    
                    // Caso 3: Objeto Date real
                    if (fecha instanceof Date) {
                        return fecha.toISOString().split('T')[0];
                    }

                    return fStr; // Retornar tal cual si no sabemos qué es
                };

                // 1. Obtenemos las fechas en formato texto simple
                const fechaProyectoStr = normalizarFecha(p.fechaAsignacion || p.fechaCreacion);
                const filtroInicioStr = rankingStartDate; // Ya viene como "2025-11-01"
                const filtroFinStr = rankingEndDate;     // Ya viene como "2025-11-20"

                // 2. Comparación Alfanumérica (Infalible para fechas ISO)
                // "¿Es 2025-11-20 mayor o igual a 2025-11-01 y menor o igual a 2025-11-20?"
                const estaDentroDelRango = (fechaProyectoStr >= filtroInicioStr && fechaProyectoStr <= filtroFinStr);

                // 3. Debug en consola (Solo para el ID 7 - Jesus)
                if (p.id === 7) {
                    console.log(`🕵️‍♂️ REVISIÓN JESUS (ID 7):`, {
                        FechaOriginal: p.fechaAsignacion,
                        FechaNormalizada: fechaProyectoStr,
                        FiltroInicio: filtroInicioStr,
                        FiltroFin: filtroFinStr,
                        PASA: estaDentroDelRango
                    });
                }

                // SI NO PASA EL FILTRO, LO IGNORAMOS
                if (!estaDentroDelRango) return acc;
                
                // SI NO TIENE COLABORADOR, LO IGNORAMOS
                if (!p.colaboradorAsignado || !p.colaboradorAsignado.id) return acc;

                const colabId = p.colaboradorAsignado.id;
                
                // Inicializar usuario
                if (!acc[colabId]) {
                  acc[colabId] = {
                    usuario: p.colaboradorAsignado,
                    total: 0,
                    concluidos: 0,
                    activos: 0,
                    urgentes: 0,
                    criticos: 0,
                    normales: 0
                  };
                }

                // Sumar puntos
                acc[colabId].total++;
                
                if (p.status === 'Concluido') {
                  acc[colabId].concluidos++;
                } else {
                  acc[colabId].activos++;
                  
                  // Calcular urgencia (Aquí sí usamos new Date para restar días)
                  const hoy = new Date();
                  // Para calcular días transcurridos, usamos fechaCreacion que es fija
                  const fechaAntiguedad = p.fechaCreacion && p.fechaCreacion.includes('/') 
                        ? new Date(p.fechaCreacion.split('/').reverse().join('-')) // Convertir a ISO para el objeto Date
                        : new Date(p.fechaCreacion);

                  const diffTime = hoy.getTime() - fechaAntiguedad.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                  
                  if (diffDays >= 10) acc[colabId].criticos++;
                  else if (diffDays >= 5) acc[colabId].urgentes++;
                  else acc[colabId].normales++;
                }

                return acc;
              }, {}); 
              // --- 3. ORDENAMIENTO (RANKING) ---
              const rankingArray = Object.values(statsObj).sort((a: any, b: any) => {
                // Gana quien tenga más TOTAL. Si empatan, gana quien tenga más CONCLUIDOS.
                if (b.total !== a.total) return b.total - a.total;
                return b.concluidos - a.concluidos;
              });

              // Máximo puntaje para calcular porcentaje de barras (evitando división por cero)
              const maxScore = rankingArray.length > 0 ? (rankingArray[0] as any).total : 1;
// --- 4. RENDERIZADO (VISUAL: TABLA GAMIFICADA) ---
              if (rankingArray.length === 0) {
                return (
                  <div className="text-center py-5 my-3 border border-dashed rounded bg-light">
                    <h2 style={{fontSize: '2rem'}}>📅</h2>
                    <h5 className="text-muted fw-bold mt-2">Sin datos en este periodo</h5>
                    <p className="text-muted small mb-0">Ajusta las fechas o comienza a trabajar para aparecer aquí.</p>
                  </div>
                );
              }

              return (
                <div className="table-responsive mt-3">
                  <Table hover className="align-middle mb-0" style={{ fontSize: '0.9rem' }}>
                    <thead className="bg-light text-secondary text-uppercase small">
                      <tr>
                        <th className="border-0 ps-4">Rank</th>
                        <th className="border-0">Colaborador</th>
                        <th className="border-0 text-center">Total</th>
                        <th className="border-0">Salud del Trabajo</th>
                        <th className="border-0" style={{width: '25%'}}>Rendimiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingArray.map((stat: any, index: number) => {
                        
                        // Configuración visual según posición
                        let rankIcon;
                        let rowClass = "";
                        let barColor = "bg-primary";

                        if (index === 0) {
                          rankIcon = <span style={{fontSize: '1.5rem'}}>🥇</span>;
                          rowClass = "bg-warning bg-opacity-10"; // Fondo sutil para el líder
                          barColor = "bg-warning"; 
                        } else if (index === 1) {
                          rankIcon = <span style={{fontSize: '1.4rem'}}>🥈</span>;
                          barColor = "bg-secondary";
                        } else if (index === 2) {
                          rankIcon = <span style={{fontSize: '1.3rem'}}>🥉</span>;
                          barColor = "bg-danger opacity-75";
                        } else {
                          rankIcon = <span className="fw-bold text-secondary text-muted">#{index + 1}</span>;
                          barColor = "bg-info opacity-50";
                        }

                        const percentage = Math.round((stat.total / maxScore) * 100);

                        return (
                          <tr key={stat.usuario.id || index} className={rowClass} style={{borderBottom: '1px solid #f0f0f0'}}>
                            
                            {/* 1. RANKING */}
                            <td className="ps-4 fw-bold">{rankIcon}</td>
                            
                            {/* 2. NOMBRE Y CONCLUIDOS */}
                            <td>
                                <div className="d-flex flex-column">
                                    <span className="fw-bold text-dark">{stat.usuario.username || stat.usuario.nombre}</span>
                                    <small className="text-muted" style={{fontSize: '0.75rem'}}>
                                        {stat.concluidos} casos finalizados
                                    </small>
                                </div>
                            </td>

                            {/* 3. TOTAL (Centro de atención) */}
                            <td className="text-center">
                                <h5 className="mb-0 fw-black text-primary">{stat.total}</h5>
                            </td>

                            {/* 4. ESTADO (Badges compactos) */}
                            <td>
                                <div className="d-flex gap-2 align-items-center">
                                    {/* NORMALES */}
                                    <div className="d-flex align-items-center gap-1 text-muted small">
                                        🟢 {stat.normales}
                                    </div>

                                    {/* URGENTES */}
                                    {stat.urgentes > 0 ? (
                                        <Badge bg="warning" text="dark" className="fw-normal shadow-sm">
                                            ⚠️ {stat.urgentes}
                                        </Badge>
                                    ) : (
                                        <span className="opacity-25 grayscale small">⚠️ 0</span> 
                                    )}

                                    {/* CRÍTICOS */}
                                    {stat.criticos > 0 ? (
                                        <Badge bg="danger" className="fw-normal shadow-sm animate__animated animate__pulse animate__infinite">
                                            🔥 {stat.criticos}
                                        </Badge>
                                    ) : (
                                        <span className="opacity-25 grayscale small">🔥 0</span>
                                    )}
                                </div>
                            </td>

                            {/* 5. BARRA DE RENDIMIENTO */}
                            <td>
                                <div className="d-flex align-items-center gap-2">
                                    <div className="progress flex-grow-1" style={{ height: '6px', borderRadius: '3px', backgroundColor: '#e9ecef' }}>
                                        <div 
                                            className={`progress-bar ${barColor}`} 
                                            role="progressbar" 
                                            style={{ width: `${percentage}%`, transition: 'width 1s ease' }} 
                                        ></div>
                                    </div>
                                    <span className="small fw-bold text-muted" style={{width: '30px', textAlign: 'right'}}>{percentage}%</span>
                                </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              );
            })()}
          </Card.Body>
        </Card>
      )}
  {/* --- 👆 FIN DE LA CORRECCIÓN --- */}
      {/* ================================================================ */}
      {/* ===== 🚀 MODAL DE CREACIÓN DE PROYECTO (ACTUALIZADO) 🚀 ===== */}
      {/* ================================================================ */}
      {/* MODIFICACIÓN AQUÍ: Añadimos 'Colaborador' a la condición */}
      {(userRole === 'Asesor' || userRole === 'Administrador' || userRole === 'Colaborador') && (
        <div className="mb-4">
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(true)}
            className="mb-3"
          >
            Crear Nuevo Proyecto
          </Button>
        </div>
      )}

      {/* ================================================================ */}
{/* ===== 🚀 MODAL DE CREACIÓN (DISEÑO PROFESIONAL Y LIMPIO) 🚀 ===== */}
{/* ================================================================ */}
<Modal show={showCreateForm} onHide={handleCloseCreateModal} size="lg">
  <Form onSubmit={handleCreateSubmit}>
    <Modal.Header closeButton>
      <Modal.Title>Crear Nuevo Proyecto</Modal.Title>
    </Modal.Header>

    <Modal.Body style={{ backgroundColor: '#f8f9fa' }}> 

      {/* Alerta de error */}
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {/* --- SECCIÓN 1: DETALLES PRINCIPALES --- */}
      <Card className="mb-4 shadow-sm border-0">
        <Card.Body>
          <h6 className="fw-bold text-primary mb-3 border-bottom pb-2">
            1. Detalles del Proyecto
          </h6>
          
          {/* CAMPO 1: NOMBRE */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Nombre del Centro / Proyecto</Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: Politécnico Félix María Ruiz"
              value={newNombreCentro}
              onChange={(e) => setNewNombreCentro(e.target.value)}
              required
              size="lg"
            />
          </Form.Group>

          {/* CAMPO 2: SELECTOR DE ÁREA (Auto-asignación) */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold text-success">
              <i className="bi bi-diagram-3-fill me-1"></i> 
              Departamento / Área (Opcional)
            </Form.Label>
            <Form.Select
              value={nuevoArea} 
              onChange={(e) => setNuevoArea(e.target.value)}
              className="border-success"
            >
              <option value="">General (Asignaré manualmente después)</option>
              <option value="Impresion">Impresión (Va directo a Jesus)</option>
              <option value="Coordinacion Administrativa">Coord. Administrativa (Va directo a Yubelis)</option>
              <option value="Redes y Web">Redes y Web (Va directo a Alondra)</option>
            </Form.Select>
            <Form.Text className="text-muted small">
              * Si eliges un área, el proyecto se asignará e iniciará automáticamente.
            </Form.Text>
          </Form.Group>

        </Card.Body>
      </Card>

      {/* --- SECCIÓN 2: CASOS (SUB-TAREAS) --- */}
      <h5 className="mb-3">2. Casos (Sub-tareas)</h5>

      <ListGroup variant="flush" className="mb-3">
        {newCasos.map((caso, index) => (
          <ListGroup.Item key={index} className="p-3 mb-3 border rounded shadow-sm bg-white">

            {/* Título y Botón Borrar */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h6 className="m-0 fw-bold text-secondary">Caso #{index + 1}</h6>
              {newCasos.length > 1 && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleRemoveCaso(index)}
                  disabled={isLoading}
                >
                  <i className="bi bi-trash"></i> Eliminar
                </Button>
              )}
            </div>

            {/* Descripción */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted">Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={caso.descripcion}
                onChange={(e) => handleCasoChange(index, e.target.value)}
                required
                placeholder="Describe la tarea a realizar..."
                disabled={isLoading}
              />
            </Form.Group>

            {/* Imágenes */}
            <Form.Group>
              <Form.Label className="small fw-bold text-muted">Imágenes de Referencia (Opcional)</Form.Label>
              <Form.Control
                type="file"
                multiple
                // No usamos ref aquí para evitar problemas con múltiples filas
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCasoFileChange(index, e)}
                disabled={isLoading}
              />
            </Form.Group>

            {/* Lista de archivos seleccionados */}
            {caso.files.length > 0 && (
              <div className="mt-2 d-flex flex-wrap gap-2">
                {caso.files.map((file, fileIndex) => (
                  <span key={fileIndex} className="badge bg-light text-dark border d-flex align-items-center">
                    {file.name.substring(0, 15)}...
                    <span 
                      className="ms-2 text-danger cursor-pointer fw-bold" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRemoveCasoFile(index, fileIndex)}
                    >
                      &times;
                    </span>
                  </span>
                ))}
              </div>
            )}

          </ListGroup.Item>
        ))}
      </ListGroup>
      <Button
        variant="secondary"
        onClick={handleAddCaso}
        className="mt-1 w-100" // Ancho completo
        disabled={isLoading}
      >
        + Añadir otro caso
      </Button>

    </Modal.Body>
    {/* --- 👆 FIN DEL REDISEÑO --- */}

    <Modal.Footer>
      <Button
        variant="secondary"
        onClick={handleCloseCreateModal}
        disabled={isLoading}
      >
        Cancelar
      </Button>
      <Button variant="success" type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />{' '}
            Guardando...
          </>
        ) : (
          'Guardar Proyecto'
        )}
      </Button>
    </Modal.Footer>
  </Form>
</Modal>
{/* ================================================================ */}
      {/* ===== 📋 LISTA DE PROYECTOS ACTIVOS (Versión Final TypeScript) 📋 ===== */}
      {/* ================================================================ */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Card.Title as="h3" className="mb-4">Lista de Proyectos Activos</Card.Title>
          
          {/* Lógica de Pestañas */}
          {(() => {
            
            // 🔧 CORRECCIÓN FINAL DE TYPESCRIPT 🔧
            // Usamos la variable 'pendientesActivos' en un log para que TS no se queje de que no se usa.
            console.log("Total General Activos en memoria:", pendientesActivos.length);

            // Lógica Real: Usamos 'pendientesFiltrados' para respetar los filtros de arriba.
            const activosReales = pendientesFiltrados.filter(p => p.status !== 'Concluido');

            // 2. GENERACIÓN DE PESTAÑAS
            const userTabs = [];
            
            // A. Pestaña "Sin Asignar" 
            const sinAsignar = activosReales.filter((p) => !p.colaboradorAsignado);
            
            if (sinAsignar.length > 0 || userRole === 'Administrador') {
                userTabs.push(
                  <Tab
                    key="sin-asignar"
                    eventKey="sin-asignar"
                    title={`Sin Asignar (${sinAsignar.length})`}
                  >
                    {renderPendientesTable(sinAsignar)}
                  </Tab>
                );
            }

            // B. Pestañas por Colaborador
            if (colaboradores && colaboradores.length > 0) {
              colaboradores.forEach((colab) => {
                const misActivos = activosReales.filter(
                  (p) => p.colaboradorAsignado?.id === colab.id
                );
                
                userTabs.push(
                  <Tab
                    key={colab.id}
                    eventKey={colab.id.toString()}
                    title={`${colab.username} (${misActivos.length})`}
                  >
                    {renderPendientesTable(misActivos)}
                  </Tab>
                );
              });
            }

            // 3. RENDER FINAL
            return (
              <Tabs defaultActiveKey="todos" id="pendientes-tabs" className="mb-3" fill>
                
                {/* Pestaña Principal */}
                <Tab
                  eventKey="todos"
                  title={
                    <>
                      <strong>Todos los Activos</strong> 
                      <span className="ms-2 badge bg-primary bg-opacity-10 text-primary rounded-pill border border-primary border-opacity-25">
                        {activosReales.length}
                      </span>
                    </>
                  }
                >
                  {renderPendientesTable(
                    activosReales,
                    userRole === 'Administrador'
                  )}
                </Tab>

                {/* Pestañas Individuales */}
                {userTabs}
                
              </Tabs>
            );
          })()} 
        </Card.Body>
      </Card>
{/* ================================================================ */}
{/* ===== 🚀 HISTORIAL DE PROYECTOS CONCLUIDOS 🚀 ===== */}
{/* ================================================================ */}
<Card className="mb-4 shadow-sm">
  <Card.Body>
    <Card.Title as="h3">Historial de Proyectos Concluidos</Card.Title>
    {/* Aquí re-usamos tu función 'renderPendientesTable'
        pero le pasamos la lista 'pendientesConcluidos'
        (que ya se calcula en la línea 782)
    */}
    {renderPendientesTable(pendientesConcluidos, false)}
  </Card.Body>
</Card>
      {/* Modal de Actualización (LIMPIO: Solo Asignar Colaborador) */}
      <Modal
        show={editingPendiente !== null}
        onHide={() => setEditingPendiente(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Actualizar Proyecto #{editingPendiente?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateSubmit}>
            
            {/* HE BORRADO EL SELECTOR DE ESTADO AQUÍ.
                Ahora el backend pondrá "Iniciado" automáticamente 
                cuando elijas a alguien abajo.
            */}

            {userRole === 'Administrador' && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-primary">Asignar a Colaborador</Form.Label>
                <Form.Select
                  value={selectedColaboradorId}
                  onChange={(e) => setSelectedColaboradorId(e.target.value)}
                  className="form-control-lg" // Lo hice un poco más grande para que sea fácil de ver
                >
                  <option value="">-- Sin Asignar --</option>
                  {allUsers
                    .filter((user) => user.rol === 'Colaborador' || user.rol === 'Coordinador')
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                </Form.Select>
              </Form.Group>
            )}

            <div className="d-flex justify-content-end gap-2 mt-4 border-top pt-3">
              <Button
                variant="secondary"
                onClick={() => setEditingPendiente(null)}
              >
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                💾 Guardar Asignación
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal de Ver Imágenes (el antiguo, para archivos de Pendientes) */}
      <Modal
        show={viewingImages !== null}
        onHide={() => setViewingImages(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Archivos Adjuntos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingImages?.map((imageName, index) => (
            <div key={index} className="mb-3 text-center">
              <a
                href={`${API_URL}/pendientes/uploads/${imageName}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={`${API_URL}/pendientes/uploads/${imageName}`}
                  alt={`Adjunto ${index + 1}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    border: '1px solid #ddd',
                  }}
                />
                <p>
                  <small>Ver en tamaño completo</small>
                </p>
              </a>
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setViewingImages(null)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

{/* ================================================================ */}
{/* ===== 🚀 INICIO DEL MODAL DE DETALLES (VERSIÓN FINAL 100%) 🚀 ===== */}
{/* ================================================================ */}
<Modal
  show={viewingProyecto !== null}
  onHide={() => {
    setViewingProyecto(null);
    setEditableCasos([]); 
    setError('');
    setSuccess('');
  }}
  size="xl"
  centered
>
  <Modal.Header closeButton className="bg-primary text-white">
    <Modal.Title>
      📋 Detalles: {viewingProyecto?.nombreCentro} (ID: #{viewingProyecto?.id})
    </Modal.Title>
  </Modal.Header>

  <Modal.Body style={{ backgroundColor: '#f8f9fa', maxHeight: '80vh', overflowY: 'auto' }}>
    
    {/* 1. ALERTAS DE ERROR O ÉXITO */}
    {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
    {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

    {viewingProyecto && (
      <>
        {/* 2. TARJETA DE INFORMACIÓN GENERAL */}
        <Card className="mb-4 shadow-sm border-0">
          <Card.Header as="h6" className="bg-white border-bottom fw-bold text-primary">
            ℹ️ Información General
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={4}>
                <strong>Asesor:</strong> {viewingProyecto.asesor?.username || 'N/A'}
              </Col>
              <Col md={4}>
                <strong>Asignado a:</strong>{' '}
                {viewingProyecto.colaboradorAsignado ? (
                  <Badge bg="info">{viewingProyecto.colaboradorAsignado.username}</Badge>
                ) : (
                  <Badge bg="secondary">Sin Asignar</Badge>
                )}
              </Col>
              <Col md={4}>
                <strong>Estado Actual:</strong> <Badge bg="dark">{viewingProyecto.status}</Badge>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* 3. LISTA DE CASOS */}
        <h5 className="mb-3 text-dark border-bottom pb-2">Casos Pendientes</h5>

        {editableCasos && editableCasos.length > 0 ? (
          <ListGroup variant="flush">
            {editableCasos.map((caso, index) => {
              
              // Lógica para evitar errores con el objeto estado
              const nombreEstado = typeof caso.estado === 'object' && caso.estado !== null 
                ? caso.estado.nombre 
                : caso.estado;
              const colorBadge = nombreEstado === 'Completado' ? 'success' : 'warning';

              return (
                <ListGroup.Item 
                  key={caso.id || index} 
                  className="mb-4 border rounded shadow-sm p-0 overflow-hidden bg-white"
                >
                  
                  {/* --- ZONA A: GRIS (INSTRUCCIÓN + RESPUESTA VISIBLE) --- */}
                  <div className="bg-light p-3 border-bottom">
                    
                    {/* Encabezado */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-bold text-secondary mb-0">📌 Tarea #{index + 1}</h6>
                      <Badge bg={colorBadge}>{nombreEstado}</Badge>
                    </div>
                    
                    {/* Instrucción Original */}
                    <div className="p-2 bg-white border rounded text-secondary fst-italic mb-2">
                      {caso.descripcion || "Sin descripción."}
                    </div>
{/* 👇👇👇 INICIO DE LO NUEVO: GALERÍA DE IMÁGENES 👇👇👇 */}
                    {caso.imagenes && caso.imagenes.length > 0 && (
                      <div className="mb-3 mt-2 border-top pt-2">
                        <small className="fw-bold text-primary d-block mb-2">
                          <i className="bi bi-images"></i> Referencias Visuales:
                        </small>
                        <div className="d-flex flex-wrap gap-2">
                          {caso.imagenes.map((imgName, imgIndex) => (
                            <Button
                              key={imgIndex}
                              variant="outline-primary"
                              size="sm"
                              style={{ fontSize: '0.8rem' }}
                              onClick={() => {
                                // Construimos la URL para abrirla en otra pestaña
                                const url = `${API_URL}/uploads/${imgName}`;
                                window.open(url, '_blank');
                              }}
                            >
                              👁️ Ver Foto {imgIndex + 1}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* 👆👆👆 FIN DE LO NUEVO 👆👆👆 */}
                    {/* Archivo Original */}
                    {caso.archivoUrl && !caso.pendiente && (
                      <div className="mb-2">
                        <a href={caso.archivoUrl} target="_blank" rel="noreferrer" className="text-decoration-none small">
                          📎 Ver Adjunto Original
                        </a>
                      </div>
                    )}

                    {/* 👇 AQUÍ SE MUESTRA TU RESPUESTA GUARDADA ("TRA TRA") 👇 */}
                    {(caso.comentario || (caso.archivoUrl && caso.pendiente)) && (
                      <div className="mt-3 pt-2 border-top border-secondary-subtle">
                        <strong className="small text-primary d-block mb-1">✅ Tu Reporte Actual:</strong>
                        
                        {/* Tu comentario */}
                        {caso.comentario && (
                           <div className="p-2 bg-info-subtle border border-info rounded text-dark small mb-2">
                             💬 {caso.comentario}
                           </div>
                        )}

                        {/* Tu foto */}
                        {caso.archivoUrl && (
                          <a 
                            href={caso.archivoUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn btn-sm btn-dark"
                          >
                            📷 Ver Evidencia Subida
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* --- ZONA B: BLANCA (FORMULARIO) --- */}
                  <div className="p-3">
                    <h6 className="fw-bold text-primary mb-3">
                      <i className="bi bi-pencil-square me-2"></i>
                      Actualizar / Responder
                    </h6>

                    <Row className="g-3">
                      {/* Selector Estado */}
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-bold text-muted">Nuevo Estado</Form.Label>
                          <Form.Select
                            size="sm"
                            defaultValue={typeof caso.estado === 'object' ? caso.estado.id : 1}
                            onChange={(e) => setNuevoEstadoCaso({ ...nuevoEstadoCaso, [caso.id]: Number(e.target.value) })}
                          >
                            <option value="1">Pendiente</option>
                            <option value="2">En Proceso</option>
                            <option value="3">Completado</option>
                            <option value="4">Crítico 🔥</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      {/* Input Archivo */}
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="small fw-bold text-muted">Nueva Evidencia</Form.Label>
                          <Form.Control
                            type="file"
                            size="sm"
                            onChange={(e: any) => {
                              if (e.target.files && e.target.files[0]) {
                                setArchivosAdjuntos({ ...archivosAdjuntos, [caso.id]: e.target.files[0] });
                              }
                            }}
                          />
                        </Form.Group>
                      </Col>

                      {/* Textarea */}
                      <Col xs={12}>
                        <Form.Group>
                          <Form.Label className="small fw-bold text-muted">Actualizar Comentario</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            placeholder="Escribe aquí para actualizar..."
                            value={comentarioEdicion[caso.id] || ''}
                            onChange={(e) => setComentarioEdicion({ ...comentarioEdicion, [caso.id]: e.target.value })}
                          />
                        </Form.Group>
                      </Col>

                      {/* Botón Guardar */}
                      <Col xs={12} className="text-end">
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => handleUpdateCaso(caso.id)}
                        >
                          💾 Guardar Avance
                        </Button>
                      </Col>
                    </Row>
                  </div>

                </ListGroup.Item>
              );
            })}
          </ListGroup>
        ) : (
          <div className="text-center p-5 text-muted bg-white border rounded">
            <p className="mb-0">No hay sub-tareas asignadas a este proyecto.</p>
          </div>
        )}
      </>
    )}
{/* ======================================================= */}
        {/* 👇 ZONA DE TRANSFERENCIA EVOLUCIONADA (CON HISTORIAL) 👇 */}
        {/* ======================================================= */}
        <div className="mt-5">
          
          {/* A. VISOR DE HISTORIAL (La Bitácora) */}
          {viewingProyecto?.historial && viewingProyecto.historial.length > 0 && (
             <div className="mb-4 p-3 bg-white border rounded shadow-sm">
                <h6 className="fw-bold text-secondary mb-3 border-bottom pb-2">
                    📜 Historial de Movimientos
                </h6>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {viewingProyecto.historial.map((mov, idx) => (
                        <div key={idx} className="d-flex align-items-start border-bottom pb-2 mb-2">
                            <div className="me-3 text-muted text-nowrap" style={{fontSize:'0.75rem', width: '80px'}}>
                                {new Date(mov.fecha).toLocaleDateString()} <br/>
                                {new Date(mov.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <div>
                                <div className="d-flex align-items-center gap-2">
                                    <Badge bg="secondary" style={{fontSize:'0.7rem'}}>{mov.autor}</Badge>
                                    <i className="bi bi-arrow-right text-muted"></i>
                                    <strong className="text-dark" style={{fontSize:'0.85rem'}}>
                                        {mov.accion}
                                    </strong>
                                </div>
                                <div className="mt-1 p-2 bg-light rounded text-secondary fst-italic border small">
                                    "{mov.nota}"
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          )}

          {/* B. FORMULARIO DE TRANSFERENCIA */}
          <div className="p-4 bg-light border rounded border-primary border-opacity-25 shadow-sm">
            <h6 className="fw-bold text-primary mb-3">
                <i className="bi bi-arrow-left-right me-2"></i>
                Gestión de Flujo / Reasignación
            </h6>
            <p className="text-muted small mb-3">
                Para transferir este proyecto, selecciona el destino y deja una nota obligatoria.
            </p>
            
            <Row className="g-3 align-items-end">
                {/* 1. Selector */}
                <Col md={4}>
                    <Form.Label className="small text-muted fw-bold">Pasar proyecto a:</Form.Label>
                    <Form.Select 
                        value={selectedColaboradorId}
                        onChange={(e) => setSelectedColaboradorId(e.target.value)}
                    >
                        <option value="">-- Seleccionar --</option>
                        {allUsers
                        .filter(u => u.rol === 'Colaborador' || u.rol === 'Coordinador')
                        .filter(u => u.id !== viewingProyecto?.colaboradorAsignado?.id)
                        .map(user => (
                            <option key={user.id} value={user.id}>
                            ➡️ {user.username} ({user.rol})
                            </option>
                        ))
                        }
                    </Form.Select>
                </Col>

                {/* 2. Nota Obligatoria */}
                <Col md={6}>
                    <Form.Label className="small text-muted fw-bold">Nota de Entrega (Obligatorio):</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Ej: Fotos listas y subidas. Falta imprimir..."
                        value={notaTransferencia}
                        onChange={(e) => setNotaTransferencia(e.target.value)}
                    />
                </Col>

                {/* 3. Botón */}
                <Col md={2}>
                    <Button 
                        variant="primary" 
                        className="w-100"
                        disabled={!selectedColaboradorId || !notaTransferencia.trim() || isLoading}
                        onClick={handleQuickTransferWithNote}
                    >
                        {isLoading ? 'Enviando...' : 'Transferir'}
                    </Button>
                </Col>
            </Row>
          </div>
        </div>
        {/* 👆 FIN ZONA DE TRANSFERENCIA 👆 */}
  </Modal.Body>

  <Modal.Footer className="bg-light">
    
    {/* 👇 1. AQUÍ VA EL NUEVO BOTÓN (Al principio) 👇 */}
    <Button 
        variant="outline-dark" 
        className="me-auto" // Esto lo empuja a la izquierda
        onClick={handlePrintReceipt}
    >
        🖨️ Imprimir Recibo
    </Button>
    {/* 👆 ------------------------------------------ 👆 */}

    {/* Botón de Finalizar (Solo jefes) */}
    {(userRole === 'Administrador' || userRole === 'Coordinador') && (
      <Button
        variant="success"
        disabled={isLoading}
        onClick={handleMarkAsConcluido}
        className="ms-2" // Margen a la izquierda para separarlo
      >
        {isLoading ? 'Finalizando...' : '✅ Finalizar Proyecto'}
      </Button>
    )}

    {/* Botón Cerrar */}
    <Button
      variant="secondary"
      className="ms-2"
      onClick={() => {
        setViewingProyecto(null);
        setEditableCasos([]);
        setError('');
        setSuccess('');
      }}
    >
      Cerrar
    </Button>
  </Modal.Footer>
</Modal>
{/* ================= FIN DEL MODAL COMPLETO ================= */}
{/* ================================================================ */}
{/* ===== 🚀 NUEVO MODAL DE CONFIRMACIÓN DE BORRADO 🚀 ===== */}
{/* ================================================================ */}
<Modal show={deletingPendiente !== null} onHide={() => setDeletingPendiente(null)} centered>
  <Modal.Header closeButton>
    <Modal.Title>Confirmar Eliminación</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Alert variant="danger">
      <p>¿Estás seguro de que quieres eliminar este proyecto?</p>
      <hr />
      <p className="mb-0">
        <strong>ID #{deletingPendiente?.id}: {deletingPendiente?.nombreCentro}</strong>
      </p>
    </Alert>
    <p className="text-muted">Esta acción no se puede deshacer.</p>
  </Modal.Body>
  <Modal.Footer>
    <Button 
      variant="secondary" 
      onClick={() => setDeletingPendiente(null)} 
      disabled={isLoading}
    >
      Cancelar
    </Button>
    <Button 
      variant="danger" 
      onClick={handleDeletePendiente} // <-- Llama a nuestra nueva función
      disabled={isLoading}
    >
      {isLoading ? 'Eliminando...' : 'Confirmar Eliminación'}
    </Button>
  </Modal.Footer>
</Modal>
</div> // <-- 1. Cierre del 'div' principal (el que faltaba o estaba desordenado)
); // <-- 2. Cierre del 'return'
} // <-- 3. Cierre de la función 'Dashboard'

export default Dashboard; // <-- 4. Exportación