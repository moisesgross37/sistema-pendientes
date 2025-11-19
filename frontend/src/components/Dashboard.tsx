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
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Estado para mensajes de éxito
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // <--- 3. ESTADO NUEVO

  // --- Estados para el Modal de Creación (Rehechos) ---
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNombreCentro, setNewNombreCentro] = useState('');

  // --- 4. ESTADO 'newCasos' ACTUALIZADO ---
  // Usa la nueva interfaz
  const [newCasos, setNewCasos] = useState<NewCasoState[]>([
    { descripcion: '', files: [] },
  ]);
  // Ref para el input de archivos
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Estados para el Modal de Actualización (Sin cambios) ---
  const [editingPendiente, setEditingPendiente] = useState<Pendiente | null>(
    null,
  );
  const [selectedColaboradorId, setSelectedColaboradorId] =
    useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // --- Estados de Filtros y Vistas (Sin cambios) ---
  const [allUsers, setAllUsers] = useState<Usuario[]>([]);
  const [colaboradores, setColaboradores] = useState<Usuario[]>([]);
  const [filtroAsesor, setFiltroAsesor] = useState('');
  const [filtroAsignado] = useState<string>('');
  const [filtroDias, setFiltroDias] = useState('');

  // (viewingImages se usará de otra forma, a nivel de Caso)
  const [viewingImages, setViewingImages] = useState<string[] | null>(null);

  // --- Estados del Modal de Detalles (los que ya hicimos) ---
  const [viewingProyecto, setViewingProyecto] = useState<Pendiente | null>(null);
  const [editableCasos, setEditableCasos] = useState<Caso[]>([]);
  const [estadosCaso, setEstadosCaso] = useState<EstadoCaso[]>([]);
  const [deletingPendiente, setDeletingPendiente] = useState<Pendiente | null>(null);

  // ================================================================
  // ===== 🚀 FUNCIONES DE API (fetchPendientes, fetchUsers) 🚀 =====
  // ================================================================
  
  // (Sin cambios aquí)
  const fetchPendientes = async (role: string) => {
    let endpointUrl = '';

    // 1. Decidimos la URL de la API basándonos en el rol
    switch (role) {
      case 'Administrador':
        endpointUrl = `${API_URL}/pendientes`;
        break;
      case 'Asesor':
        // Esta ruta la crearemos en el backend
        endpointUrl = `${API_URL}/pendientes/mis-proyectos`;
        break;
      case 'Colaborador':
         // Esta ruta también la crearemos en el backend
        endpointUrl = `${API_URL}/pendientes/mis-asignaciones`;
        break;
      default:
        // Si el rol no es ninguno de esos, mostramos un error.
        console.warn('Rol de usuario no reconocido:', role);
        setError('No tienes permisos para ver esta información.');
        return; // No continuamos
    }

    // 2. El resto de la función es igual, pero usa la 'endpointUrl'
    try {
      const response = await fetch(endpointUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
         // (Mejora: intentar leer el mensaje de error de la API)
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'No se pudo obtener la lista de proyectos.');
      }
      const data = await response.json();
      setPendientes(data);
    } catch (err: any) {
      setError(err.message);
    }
  };
// --- 👇 AÑADE ESTA NUEVA FUNCIÓN AQUÍ ---

// Esta función carga la lista de estados (Pendiente, Detenido, etc.)
const fetchEstadosCaso = async () => {
  try {
    const res = await fetch(`${API_URL}/estados-casos`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-store', // <--- AÑADIDO
      },
      cache: 'no-store', // <--- AÑADIDO
    });
    if (!res.ok) {
      throw new Error('No se pudo cargar la lista de estados.');
    }
    const data = await res.json();
    setEstadosCaso(data); // <-- 1. Guarda los estados en nuestro nuevo 'useState'
  } catch (err: any) {
    // Esto no es un error que deba detener la app,
    // solo lo mostramos en la consola.
    console.error('Error al cargar estados de caso:', err.message);
    // Podríamos poner un setError aquí si fuera crítico
    // setError(err.message); 
  }
};
// --- 👆 ---
  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.json();
        console.warn('Advertencia al cargar usuarios:', errorData.message);
        return;
      }
      const usersData = await res.json();
      setAllUsers(usersData);
      const collabUsers = usersData.filter(
        (user: Usuario) => user.rol === 'Colaborador',
      );
      setColaboradores(collabUsers);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- useEffect Principal (Sin cambios) ---
  useEffect(() => {
  try {
    const decodedToken: DecodedToken = jwtDecode(token);
    setUserRole(decodedToken.rol);
    fetchPendientes(decodedToken.rol);
    fetchEstadosCaso(); // <--- ¡AQUÍ ESTÁ LA LÍNEA AÑADIDA!

    if (decodedToken.rol === 'Administrador') {
      fetchUsers();
    }
  } catch (error) {
    console.error('Error decodificando el token:', error);
    setError('El token no es válido.');
  }
}, [token]);

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
    setError('');
    setSuccess('');
    setIsLoading(false);
  };

  // --- 7. FUNCIÓN DE ENVÍO (Submit) - Totalmente reescrita ---
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true); // <-- Activa el Spinner

    // Validación
    if (newCasos.some((caso) => caso.descripcion.trim() === '')) {
      setError('Todos los casos deben tener una descripción.');
      setIsLoading(false);
      return;
    }

    try {
      // Este array guardará los datos finales que enviaremos a la API de 'pendientes'
      const casosParaEnviar: { descripcion: string; imagenes: string[] }[] = [];

      // --- PASO A: Subir todos los archivos primero, caso por caso ---
      for (const caso of newCasos) {
        let nombresDeArchivosSubidos: string[] = [];

        if (caso.files.length > 0) {
          const formData = new FormData();
          caso.files.forEach((file) => {
            formData.append('files', file); // 'files' debe coincidir con el FilesInterceptor
          });

          // Llamamos a la nueva API de 'casos' para subir los archivos
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

          // Guardamos los nombres que nos devolvió el backend
          nombresDeArchivosSubidos = uploadData.map(
            (file: any) => file.fileName,
          );
        }

        // Añadimos el caso (con su descripción y sus nombres de archivo) al array final
        casosParaEnviar.push({
          descripcion: caso.descripcion,
          imagenes: nombresDeArchivosSubidos, // Array de nombres o array vacío
        });
      }

      // --- PASO B: Crear el Proyecto (Pendiente) ---
      const decodedToken: DecodedToken = jwtDecode(token);
      const asesorId = decodedToken.sub;

      const body = {
        nombreCentro: newNombreCentro,
        asesorId: asesorId,
        casos: casosParaEnviar, // <-- Enviamos el array que construimos
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
      handleCloseCreateModal(); // Cierra y resetea el formulario
      if (userRole) fetchPendientes(userRole);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false); // <-- Desactiva el Spinner (incluso si hay error)
    }
  };

  // ================================================================
  // ===== 🚀 LÓGICA DE MODAL DE DETALLES (ACTUALIZAR CASO) 🚀 =====
  // ================================================================

  // (Esta es la lógica que ya habíamos construido)

  const handleCasoInputChange = (
  index: number,
  field: 'estado' | 'comentario', // <--- 1. Cambiamos 'status' por 'estado'
  value: string, // El 'value' del dropdown (un ID) o del textarea (texto)
) => {
  const updatedCasos = editableCasos.map((caso, i) => {
    if (i === index) {

      // --- 👇 2. LÓGICA NUEVA ---
      if (field === 'comentario') {
        // Si solo cambia el comentario, es fácil
        return { ...caso, comentario: value };
      } 

      if (field === 'estado') {
        // Si cambia el estado, 'value' es el ID (ej: "2")
        // Debemos buscar el objeto EstadoCaso completo
        const nuevoEstado = estadosCaso.find(e => e.id === parseInt(value));

        if (nuevoEstado) {
          // Asignamos el objeto completo
          return { ...caso, estado: nuevoEstado };
        }
      }
      // --- 👆 ---
    }
    return caso;
  });
  setEditableCasos(updatedCasos);
};

  // backend/src/casos/casos.service.ts
const handleUpdateCaso = async (casoIndex: number) => {
  setError('');
  setSuccess('');
  setIsLoading(true);

  const casoAActualizar = editableCasos[casoIndex];
  if (!casoAActualizar) return;

  // --- 👇 INICIO DE LA VALIDACIÓN AÑADIDA ---
  if (
    // 1. ¿El estado seleccionado REQUIERE un comentario?
    casoAActualizar.estado.requiereComentario &&
    // 2. ¿Y el comentario está vacío o nulo?
    (!casoAActualizar.comentario ||
      casoAActualizar.comentario.trim() === '')
  ) {
    // 3. Si es así, mostrar un error y detener la función
    setError(
      `El estado "${casoAActualizar.estado.nombre}" requiere un comentario.`,
    );
    setIsLoading(false);
    return; // ¡No guardamos!
  }
  // --- 👆 FIN DE LA VALIDACIÓN ---

  const casoId = casoAActualizar.id;

  // Preparamos el 'body' para que coincida con el DTO del backend
  const body = {
    estadoId: casoAActualizar.estado.id, // Enviamos el ID del estado
    comentario: casoAActualizar.comentario, // Enviamos el comentario
  };

  try {
    // Llamamos a la API de 'casos' (PATCH)
    const res = await fetch(`${API_URL}/casos/${casoId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'No se pudo actualizar el caso.');
    }

    setSuccess(`¡Caso #${casoId} actualizado con éxito!`);

    // Recargamos la lista de proyectos para mostrar el cambio
    if (userRole) fetchPendientes(userRole);

  } catch (err: any) {
    setError(err.message);
  } finally {
    setIsLoading(false); // Desactivamos el spinner
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
    setSelectedStatus(pendiente.status);
    setSelectedColaboradorId(
      pendiente.colaboradorAsignado?.id.toString() || '',
    );
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!editingPendiente) return;
    try {
      const res = await fetch(
        `${API_URL}/pendientes/${editingPendiente.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: selectedStatus,
            colaboradorAsignadoId: selectedColaboradorId
              ? parseInt(selectedColaboradorId)
              : null,
          }),
        },
      );
      if (!res.ok) throw new Error('Falló la actualización.');
      setEditingPendiente(null);
      setSuccess('Proyecto actualizado.');
      if (userRole) fetchPendientes(userRole);
    } catch (err: any) {
      setError(err.message);
    }
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

  const performanceData = pendientesActivos
    .filter((p) => p.colaboradorAsignado)
    .reduce(
      (acc, p) => {
        const colaborador = p.colaboradorAsignado!;
        if (!acc[colaborador.id]) {
          acc[colaborador.id] = {
            username: colaborador.username,
            normal: 0,
            urgente: 0,
            critico: 0,
            total: 0,
          };
        }
        const fechaCreacion = new Date(p.fechaCreacion);
        const hoy = new Date();
        const diffTiempo = hoy.getTime() - fechaCreacion.getTime();
        const diffDias = Math.ceil(diffTiempo / (1000 * 3600 * 24));
        if (diffDias >= 10) acc[colaborador.id].critico++;
        else if (diffDias >= 5) acc[colaborador.id].urgente++;
        else acc[colaborador.id].normal++;
        acc[colaborador.id].total++;
        return acc;
      },
      {} as Record<
        string,
        {
          username: string;
          normal: number;
          urgente: number;
          critico: number;
          total: number;
        }
      >,
    );
  const performanceArray = Object.values(performanceData);

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

  {/* --- 👇 INICIO DE LA CORRECCIÓN --- */}
  {/* Desempeño de Colaboradores (Ahora condicional) */}
  {(userRole === 'Administrador' || userRole === 'Colaborador') && (
    <Card className="mb-4 shadow-sm">
      <Card.Body>
        <Card.Title as="h3">Desempeño de Colaboradores</Card.Title>
        <Row className="mt-3">
          {performanceArray.length > 0 ? (
            performanceArray.map((colab: any) => (
              <Col md={6} lg={4} key={colab.username} className="mb-3">
                {/* (Tu tarjeta 'colab' individual ya estaba bien) */}
                <Card>
                  <Card.Header as="h5">{colab.username}</Card.Header>
                  <Card.Body>
                    <Card.Text>
                      Total Asignados: <strong>{colab.total}</strong>
                    </Card.Text>
                    <div className="d-flex justify-content-around">
                      <Badge bg="success" className="p-2">
                        Normal ({colab.normal})
                      </Badge>
                      <Badge bg="warning" className="p-2 text-dark">
                        Urgente ({colab.urgente})
                      </Badge>
                      <Badge bg="danger" className="p-2">
                        Crítico ({colab.critico})
                      </Badge>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))
          ) : (
            <Col>
              <p>No hay pendientes asignados para mostrar métricas.</p>
            </Col>
          )}
        </Row>
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
{/* ===== 🚀 MODAL DE CREACIÓN (DISEÑO PROFESIONAL) 🚀 ===== */}
{/* ================================================================ */}
<Modal show={showCreateForm} onHide={handleCloseCreateModal} size="lg">
  <Form onSubmit={handleCreateSubmit}>
    <Modal.Header closeButton>
      <Modal.Title>Crear Nuevo Proyecto</Modal.Title>
    </Modal.Header>

    {/* --- 👇 INICIO DEL REDISEÑO --- */}
    <Modal.Body style={{ backgroundColor: '#f8f9fa' }}> {/* Damos un fondo gris claro al modal */}

      {/* Alerta de error DENTRO del modal */}
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      {/* --- SECCIÓN PROYECTO (CON "PRESENCIA") --- */}
      <Card className="border-2 shadow-sm mb-4">
        <Card.Body>
          <Form.Group>
            <Form.Label as="h5">Nombre del Centro (Proyecto)</Form.Label>
            <Form.Control
              type="text"
              value={newNombreCentro}
              onChange={(e) => setNewNombreCentro(e.target.value)}
              required
              placeholder="Ej: Politécnico Félix María Ruiz"
              disabled={isLoading}
              size="lg" // <-- Hacemos el texto más grande
            />
          </Form.Group>
        </Card.Body>
      </Card>

      {/* --- SECCIÓN CASOS (MEJOR ALINEADA) --- */}
      <h5>Casos (Sub-tareas)</h5>

      <ListGroup variant="flush" className="mb-3">
        {newCasos.map((caso, index) => (
          // Cada caso es su propia tarjeta blanca
          <ListGroup.Item key={index} className="p-3 mb-3 border rounded shadow-sm bg-white">

            {/* --- Título y Botón de Borrar (alineados) --- */}
            <div className="d-flex justify-content-between align-items-center mb-2">
              <Form.Label as="h6" className="m-0">
                <strong>Caso #{index + 1}</strong>
              </Form.Label>
              {newCasos.length > 1 && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleRemoveCaso(index)}
                  disabled={isLoading}
                >
                  Eliminar
                </Button>
              )}
            </div>

            {/* --- Campo de Descripción (ancho completo) --- */}
            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={caso.descripcion}
                onChange={(e) =>
                  handleCasoChange(index, e.target.value)
                }
                required
                placeholder="Descripción detallada de la sub-tarea"
                disabled={isLoading}
              />
            </Form.Group>

            {/* --- Campo de Imágenes (ancho completo) --- */}
            <Form.Group>
              <Form.Label>Imágenes (Opcional)</Form.Label>
              <Form.Control
                type="file"
                multiple
                ref={fileInputRef}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleCasoFileChange(index, e)
                }
                disabled={isLoading}
              />
            </Form.Group>

            {/* Lista de Archivos Seleccionados (Preview) */}
            {caso.files.length > 0 && (
              <ListGroup className="mt-2" horizontal>
                {caso.files.map((file, fileIndex) => (
                  <ListGroup.Item
                    key={fileIndex}
                    className="d-flex align-items-center p-1 me-1"
                  >
                    <small className="text-muted me-2">
                      {file.name.substring(0, 15)}...
                    </small>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() =>
                        handleRemoveCasoFile(index, fileIndex)
                      }
                      disabled={isLoading}
                    >
                      &times;
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
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
      {/* ===== 🚀 PESTAÑAS Y TABLAS (CORREGIDO) 🚀 ===== */}
      {/* ================================================================ */}

      {/* --- 👇 INICIO DEL CAMBIO (Paso 26.2.1) --- */}

{/* Esta Tarjeta envolverá toda la sección de Pestañas */}
<Card className="mb-4 shadow-sm">
  <Card.Body>
    <Card.Title as="h3">Lista de Proyectos Activos</Card.Title>
    
    {/* --- INICIO DE LA CORRECCIÓN DEFINITIVA V3 --- */}
    {/* Envolvemos toda la lógica en una función que se ejecuta sola: {(() => { ... })()}
      Esto nos permite usar 'const', 'if' y 'map' de forma segura DENTRO del JSX.
    */}
    {(() => {
      
      // 1. Construimos el array de pestañas del admin
      const adminTabs: React.ReactNode[] = [];
      
      if (userRole === 'Administrador') {
        
        // Pestaña "Sin Asignar"
        adminTabs.push(
          <Tab
            key="sin-asignar"
            eventKey="sin-asignar"
            title={
              <>
                Sin Asignar (
                {pendientesActivos.filter((p) => !p.colaboradorAsignado).length})
              </>
            }
          >
            {renderPendientesTable(
              pendientesActivos.filter((p) => !p.colaboradorAsignado),
            )}
          </Tab>
        );

        // Pestañas dinámicas para cada Colaborador
        colaboradores.map((colab) => {
          const pendientesDelColab = pendientesActivos.filter(
            (p) => p.colaboradorAsignado?.id === colab.id,
          );
          adminTabs.push(
            <Tab
              key={colab.id}
              eventKey={colab.id.toString()}
              title={
                <>
                  {colab.username} ({pendientesDelColab.length})
                </>
              }
            >
              {renderPendientesTable(pendientesDelColab)}
            </Tab>
          );
        });
      }

      // 2. Ahora retornamos el componente <Tabs> completo
      return (
        <Tabs defaultActiveKey="todos" id="pendientes-tabs" className="mb-3" fill>
          
          {/* Pestaña "Todos" (Esta ya estaba bien) */}
          <Tab
            eventKey="todos"
            title={
              <>
                <strong>
                  {userRole === 'Administrador' ? 'Todos' : 'Mis Proyectos'}
                </strong> ({pendientesActivos.length})
              </>
            }
          >
            {renderPendientesTable(
              pendientesActivos,
              userRole === 'Administrador',
            )}
          </Tab>

          {/* Aquí simplemente renderizamos el array que construimos */}
          {/* React pondrá las pestañas aquí (si hay) o no pondrá nada */}
          {adminTabs}
          
        </Tabs>
      );
    })()}
    {/* --- FIN DE LA CORRECCIÓN DEFINITIVA V3 --- */}

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
      {/* Modal de Actualización (Asignar Colaborador) */}
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
            <Form.Group className="mb-3">
              <Form.Label>Estado</Form.Label>
              <Form.Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="Por Asignar" disabled></option>
                <option value="Iniciado">Iniciado</option>
                <option value="Fuera de oficina">Fuera de oficina</option>
                <option value="En administración">En administración</option>
                <option value="Concluido">Concluido</option>
              </Form.Select>
            </Form.Group>
            {userRole === 'Administrador' && (
              <Form.Group className="mb-3">
                <Form.Label>Asignar a Colaborador</Form.Label>
                <Form.Select
                  value={selectedColaboradorId}
                  onChange={(e) => setSelectedColaboradorId(e.target.value)}
                >
                  <option value="">-- Sin Asignar --</option>
                  {allUsers
                    .filter((user) => user.rol === 'Colaborador')
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                </Form.Select>
              </Form.Group>
            )}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => setEditingPendiente(null)}
              >
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Guardar Cambios
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
{/* ===== 🚀 MODAL DE DETALLES (DISEÑO PROFESIONAL) 🚀 ===== */}
{/* ================================================================ */}
<Modal
  show={viewingProyecto !== null}
  onHide={() => {
    setViewingProyecto(null);
    setEditableCasos([]); // Limpiamos el estado de edición al cerrar
    setError(''); // Limpiamos errores
    setSuccess(''); // Limpiamos éxito
  }}
  size="xl"
  centered
>
  <Modal.Header closeButton>
    <Modal.Title>
      Detalles del Proyecto: {viewingProyecto?.nombreCentro} (ID: #
      {viewingProyecto?.id})
    </Modal.Title>
  </Modal.Header>

  {/* --- 👇 INICIO DEL REDISEÑO --- */}
  <Modal.Body style={{ backgroundColor: '#f8f9fa' }}> {/* Fondo gris claro */}

    {/* Alertas de error/éxito DENTRO del modal */}
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

    {viewingProyecto && (
      <>
        {/* --- Sección de Información General (Ahora con sombra) --- */}
        <Card className="mb-4 shadow-sm">
          <Card.Header as="h5">Información General</Card.Header>
          <Card.Body>
            <Row>
              <Col md={4}>
                <strong>Asesor:</strong> {viewingProyecto.asesor.username}
              </Col>
              <Col md={4}>
                <strong>Asignado a:</strong>{' '}
                {viewingProyecto.colaboradorAsignado ? (
                  viewingProyecto.colaboradorAsignado.username
                ) : (
                  <Badge bg="secondary">Sin Asignar</Badge>
                )}
              </Col>
              <Col md={4}>
                <strong>Estado General:</strong> {viewingProyecto.status}
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* --- Sección de Lista de Casos (INTERACTIVA) --- */}
        <h5>Casos (Sub-tareas)</h5>

        <ListGroup>
          {editableCasos.map((caso, index) => (
            // --- Cada caso es una Tarjeta Blanca ---
            <ListGroup.Item 
              key={caso.id} 
              className="p-3 mb-3 border rounded shadow-sm bg-white"
            >
              <Row>
                {/* Columna de Descripción y Archivos */}
                <Col md={5}>
                  <Form.Label>
                    <strong>Caso #{index + 1}:</strong> Descripción
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    defaultValue={caso.descripcion}
                    readOnly // Mantenemos la descripción como solo lectura
                  />

                  {/* Mostrar imágenes/archivos del caso (Arreglado) */}
                  {caso.imagenes && caso.imagenes.length > 0 && (
                    <div className='mt-2'>
                      <small>Archivos Adjuntos:</small>
                      <ListGroup horizontal>
                        {caso.imagenes.map((imgName, imgIdx) => (
                          <ListGroup.Item 
                            key={imgIdx} 
                            as="a" 
                            href={`${API_URL}/pendientes/uploads/${imgName}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className='p-1 me-1'
                          >
                            {imgName.endsWith('.pdf') ? `Ver PDF ${imgIdx + 1}` : `Ver Imagen ${imgIdx + 1}`}
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </div>
                  )}
                </Col>

                {/* Columna de Estado y Comentario (INTERACTIVA) */}
                <Col md={4}>
                  <Form.Group className="mb-2">
                    <Form.Label>Estado del Caso</Form.Label>
                    <Form.Select
                      value={caso.estado ? caso.estado.id : ''}
                      onChange={(e) =>
                        handleCasoInputChange(index, 'estado', e.target.value)
                      }
                      disabled={isLoading}
                      // --- Mejora Visual del Color (que ya hicimos) ---
                      style={{
                        color: caso.estado ? caso.estado.color : '#000',
                        fontWeight: 'bold',
                        borderColor: caso.estado ? caso.estado.color : '#dee2e6',
                      }}
                    >
                      {estadosCaso.map((estado) => (
                        <option key={estado.id} value={estado.id}>
                          {estado.nombre}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Comentario</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={1}
                      placeholder="Añadir un comentario..."
                      value={caso.comentario || ''}
                      onChange={(e) =>
                        handleCasoInputChange(
                          index,
                          'comentario',
                          e.target.value,
                        )
                      }
                      disabled={isLoading}
                    />
                  </Form.Group>
                </Col>

                {/* Columna de Acciones (INTERACTIVA) */}
                <Col
                  md={3}
                  className="d-flex flex-column align-items-end justify-content-between"
                >
                  <Button
                    variant="primary"
                    className="w-100 mt-auto"
                    onClick={() => handleUpdateCaso(index)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Guardando...' : 'Guardar Caso'}
                  </Button>
                </Col>
              </Row>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </>
    )}
  </Modal.Body>
  {/* --- 👆 FIN DEL REDISEÑO --- */}

  <Modal.Footer>
    {/* Botón de Finalizar (que ya añadimos) */}
    {userRole === 'Administrador' && (
      <Button
        variant="success"
        disabled={isLoading}
        onClick={handleMarkAsConcluido}
        className="me-auto" 
      >
        {isLoading ? 'Finalizando...' : 'Finalizar Proyecto'}
      </Button>
    )}

    <Button
      variant="secondary"
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