// frontend/src/components/Dashboard.tsx
import { useState, useEffect, useRef } from 'react';
import type { AppView } from '../App';
import { MarketingPanel } from './MarketingPanel';
import { jwtDecode } from 'jwt-decode';
import Select from 'react-select'; 
import { AdminCentros } from "./AdminCentros";
import { MarketingHitos } from './MarketingHitos';
import {
  Button, Table, Form, Modal, Card, Alert, Row, Col, Badge, ListGroup, Tabs, Tab, Spinner, Accordion
} from 'react-bootstrap';

const API_URL = import.meta.env.VITE_API_URL;

// --- Interfaces ---
interface Caso { id: number; descripcion: string; estado: EstadoCaso; imagenes: string[]; fechaCreacion: Date; comentario: string | null; archivoUrl?: string; pendiente?: any; }
interface Pendiente { id: number; fechaCreacion: string; fechaAsignacion: string | null; fechaConclusion: string | null; nombreCentro: string; status: string; asesor: Usuario; colaboradorAsignado?: Usuario | null; casos: Caso[]; historial?: { fecha: string; autor: string; accion: string; nota: string; }[]; }
interface Usuario { id: number; username: string; rol: string; isActive: boolean; }
interface DecodedToken { sub: number; username: string; rol: string; }
interface DashboardProps { token: string; setView: (view: AppView) => void; }
interface EstadoCaso { id: number; nombre: string; color: string; requiereComentario: boolean; }
interface NewCasoState { descripcion: string; files: File[]; }

// --- Componente ---
function Dashboard({ token, setView }: DashboardProps) { // 👈 PUERTA DE ENTRADA
  
  // 1. Estados Generales
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [pendientesFiltrados, setPendientesFiltrados] = useState<Pendiente[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMarketing, setShowMarketing] = useState(false);
  const [showAdminCentros, setShowAdminCentros] = useState(false);
  const [showCrearCentroModal, setShowCrearCentroModal] = useState(false);
const [showActivaciones, setShowActivaciones] = useState(false); // 🗓️ Controla la nueva ventana
  // 🏭 MEMORIA PARA EL FORMULARIO DE CENTROS
  const [newCentroNombre, setNewCentroNombre] = useState('');
  const [newCentroAsesor, setNewCentroAsesor] = useState('');
  const [newCentroPadre, setNewCentroPadre] = useState('');
  const [newCentroTio, setNewCentroTio]   = useState('');
  const [newCentroTipo, setNewCentroTipo]     = useState('cliente');
const user = token ? JSON.parse(atob(token.split('.')[1])) : null;  
const [modoVista, setModoVista] = useState<'activos' | 'historial'>('activos');
const [searchTerm, setSearchTerm] = useState('');
const [transferDestino, setTransferDestino] = useState('');
const [filtroPadre, setFiltroPadre] = useState('');
// 📝 ESTADO PARA EL CHAT DE LA TAREA
  const [nuevaNota, setNuevaNota] = useState('');
  const [enviandoNota, setEnviandoNota] = useState(false);
  const [busquedaCentro, setBusquedaCentro] = useState(''); // 🔍 Filtro para la tabla
// ESTADO PARA LA NUEVA VENTANA DE TRABAJO
const [tareaSeleccionada, setTareaSeleccionada] = useState<Pendiente | null>(null);
  // 💾 FUNCIÓN INTELIGENTE (CONECTADA Y CATEGORIZADA)
  const handleGuardarCentro = async () => {
    if (!newCentroNombre.trim()) return alert("⚠️ El nombre es obligatorio.");

    setIsLoading(true);

    try {
        // Preparamos el paquete con el TIPO incluido
        const datosAEnviar = {
            nombre: newCentroNombre,
            tipo: newCentroTipo, // <--- AQUÍ VA EL NUEVO DATO
            // Si es interno, mandamos NULL en asesor y tío para limpiar basura vieja
            asesor: newCentroTipo === 'cliente' ? newCentroAsesor : null,
            padre: newCentroPadre,
            tio: newCentroTipo === 'cliente' ? newCentroTio : null
        };

        let respuesta;
        
        if (editingId !== null) {
            // EDITAR
            respuesta = await fetch(`${API_URL}/marketing/admin/centro/${editingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosAEnviar)
            });
        } else {
            // CREAR
            respuesta = await fetch(`${API_URL}/marketing/admin/centro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosAEnviar)
            });
        }

        if (!respuesta.ok) {
            const errorData = await respuesta.json();
            throw new Error(errorData.message || "Error al guardar");
        }

        // Recargamos la lista
        const resLista = await fetch(`${API_URL}/marketing/admin/lista-centros`);
        if (resLista.ok) {
            setListaCentros(await resLista.json());
        }

        alert("✅ ¡Guardado exitosamente!");
        
        // Limpiamos todo
        setShowCrearCentroModal(false);
        setEditingId(null);
        setNewCentroNombre('');
        setNewCentroTipo('cliente'); // Reseteamos al valor por defecto
        setNewCentroAsesor('');
        setNewCentroPadre('');
        setNewCentroTio('');

        if(userRole) fetchPendientes(userRole);

    } catch (error: any) {
        // EN LUGAR DE ALERT, USAMOS ESTO:
        setError("❌ " + error.message); // Esto muestra el mensaje rojo en pantalla
        
        // Opcional: Borrar el mensaje a los 5 segundos
        setTimeout(() => setError(''), 5000);
    } finally {
        setIsLoading(false);
    }
  };


  // 👇 ESTA VARIABLE SOLO DEBE ESTAR UNA VEZ EN TODO EL ARCHIVO 👇
  const totalPorVerificar = pendientes.reduce((acc, p) => {
    // Cuenta los casos que están en estado 'Resuelto' (ID 3)
    return acc + (p.casos ? p.casos.filter(c => c.estado?.nombre === 'Resuelto').length : 0);
  }, 0);

  // --- 🧠 NUEVO: CEREBRO DE MARKETING (MAPA DE ESTADOS) 🧠 ---
  // (CORREGIDO: Ahora usa 'mapa' consistentemente)
  const [marketingMap, setMarketingMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const cargarMapaMarketing = async () => {
      try {
        const res = await fetch(`${API_URL}/marketing`);
        if (res.ok) {
          const data = await res.json();
          const mapa: Record<string, any> = {}; // 👈 Aquí la creamos como 'mapa'
          
          data.forEach((m: any) => {
            const ev = m.eventos_data || {};
            let hechos = 0;
            if(ev.combos?.fecha_realizacion) hechos++;
            if(ev.lanzamiento?.fecha_realizacion) hechos++;
            if(ev.exterior?.fecha_realizacion) hechos++;
            if(ev.pre_graduacion?.fecha_realizacion) hechos++;
            if(ev.graduacion?.fecha_realizacion) hechos++;
            
            // 👇 AQUÍ ESTABA EL ERROR: Decía 'map', ahora dice 'mapa'
            mapa[m.nombre_centro.trim().toLowerCase()] = {
              existe: true,
              progreso: hechos,
              total: 5,
              completo: hechos === 5
            };
          });
          setMarketingMap(mapa);
        }
      } catch (err) {
        console.error("Error cargando mapa marketing", err);
      }
    };
    cargarMapaMarketing();
  }, [pendientes]);
  // ... Otros estados ...
  const [nuevoEstadoCaso, setNuevoEstadoCaso] = useState<Record<number, number>>({});
  const [comentarioEdicion, setComentarioEdicion] = useState<Record<number, string>>({});
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<Record<number, File | null>>({});
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNombreCentro, setNewNombreCentro] = useState('');
  const [newCasos, setNewCasos] = useState<NewCasoState[]>([{ descripcion: '', files: [] }]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingPendiente, setEditingPendiente] = useState<Pendiente | null>(null);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>('');

  const [allUsers, setAllUsers] = useState<Usuario[]>([]);
  const [colaboradores, setColaboradores] = useState<Usuario[]>([]);
  const [filtroAsesor, setFiltroAsesor] = useState('');
  const [filtroAsignado] = useState<string>('');
  const [filtroDias, setFiltroDias] = useState('');

  const [viewingImages, setViewingImages] = useState<string[] | null>(null);
  const [viewingProyecto, setViewingProyecto] = useState<Pendiente | null>(null);
  const [editableCasos, setEditableCasos] = useState<Caso[]>([]);
  const [deletingPendiente, setDeletingPendiente] = useState<Pendiente | null>(null);
  const [notaTransferencia, setNotaTransferencia] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [viewingTask, setViewingTask] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  
  // 🏭 BASE DE DATOS DE CENTROS
  const [listaCentros, setListaCentros] = useState<any[]>([]); // Arranca vacía

  // ✅ VERSIÓN CORREGIDA: Carga la lista para AMBAS ventanas
  useEffect(() => {
    // CAMBIO 1: Ahora carga si abres Gestión de Centros O si abres Crear Tarea
    if (showAdminCentros || showCreateForm) { 
        const cargarCentrosReales = async () => {
            try {
                const res = await fetch(`${API_URL}/marketing/admin/lista-centros`);
                if (res.ok) {
                    const data = await res.json();
                    setListaCentros(data);
                    // console.log("Lista cargada para validación:", data.length); // Opcional para depurar
                }
            } catch (err) {
                console.error("Error cargando centros:", err);
            }
        };
        cargarCentrosReales();
    }
    // CAMBIO 2: Agregamos 'showCreateForm' para que reaccione al botón "Nuevo"
  }, [showAdminCentros, showCreateForm]);
    // ==============================================================
  // 1. FUNCIÓN FETCH PENDIENTES (Con Auto-Logout)
  // ==============================================================
  const fetchPendientes = async (role: string) => {
    let endpointUrl = '';

    switch (role) {
      case 'Administrador':
      case 'Coordinador': 
        endpointUrl = `${API_URL}/pendientes`;
        break;
      case 'Asesor':
        endpointUrl = `${API_URL}/pendientes/mis-proyectos`;
        break;
      case 'Colaborador':
        endpointUrl = `${API_URL}/pendientes/mis-asignaciones`;
        break;
      default:
        return;
    }

    try {
      const token = localStorage.getItem('authToken'); 
      

      if (!token) return; 

      const response = await fetch(endpointUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
      setPendientesFiltrados(data); 

    } catch (err: any) {
      console.error(err);
    }
  };
// ==========================================
  // 📨 FUNCIÓN: ENVIAR NOTA A LA BITÁCORA (CON IDENTIDAD)
  // ==========================================
  const handleEnviarNota = async () => {
    if (!nuevaNota.trim() || !viewingTask) return;

    setEnviandoNota(true);
    try {
      // 👇 Tomamos tu nombre del estado global del usuario
      const usuarioActual = user ? user.username : 'Usuario';

      const res = await fetch(`${API_URL}/pendientes/${viewingTask.id}/historial`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            nota: nuevaNota, 
            accion: 'COMENTARIO',
            autor: usuarioActual // 👈 Ahora el servidor sabrá quién eres
        })
      });

      if (res.ok) {
        const nuevoEvento = {
            fecha: new Date().toISOString(),
            autor: usuarioActual,
            accion: 'COMENTARIO',
            nota: nuevaNota
        };

        const tareaActualizada = { ...viewingTask };
        if (!tareaActualizada.historial) tareaActualizada.historial = [];
        tareaActualizada.historial.push(nuevoEvento);
        
        setViewingTask(tareaActualizada); 
        setNuevaNota(''); 
      } else {
        alert("⚠️ El servidor no guardó la nota.");
      }
    } catch (error) {
      console.error(error);
      alert("❌ Error de conexión al enviar nota.");
    } finally {
      setEnviandoNota(false);
    }
  };
  
  // ======================================================
  // 🧠 LÓGICA DEL BUSCADOR INTELIGENTE (AUTOCOMPLETE) 🧠
  // ======================================================
  const [centroOptions, setCentroOptions] = useState<{value: string, label: string}[]>([]);

  // Cargar la lista maestra cuando se abre el modal de crear
  useEffect(() => {
    if (showCreateForm) {
      const fetchCentros = async () => {
        try {
          // Asegúrate de que API_URL esté definido en tu archivo (debería estarlo)
          // Si no, usa: 'https://sistema-pendientes.onrender.com'
          const res = await fetch(`${API_URL}/marketing/lista-centros`);
          if (res.ok) {
            const data = await res.json();
            // Formateamos para que el buscador lo entienda
            const options = data.map((c: any) => ({ value: c.nombre, label: c.nombre }));
            setCentroOptions(options);
          }
        } catch (error) {
          console.error("Error cargando lista de centros", error);
        }
      };
      fetchCentros();
    }
  }, [showCreateForm]);
  // ... (Debajo de tus otros useState) ...
  const [listaServicios, setListaServicios] = useState<{id: number, nombre: string}[]>([]);

  // 👇 CARGAR CATÁLOGO DE SERVICIOS AL INICIO
  useEffect(() => {
    const fetchServicios = async () => {
      try {
        const res = await fetch(`${API_URL}/servicios`);
        if (res.ok) {
          const data = await res.json();
          setListaServicios(data);
        }
      } catch (error) {
        console.error("Error cargando servicios", error);
      }
    };
    fetchServicios();
  }, []);
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
        (user: Usuario) => 
          (user.rol === 'Colaborador' || user.rol === 'Coordinador') && 
          user.isActive === true // 👈 ESTO ES LO NUEVO: Solo los activos
      );
      setColaboradores(collabUsers);

    } catch (err: any) {
      console.error(err.message);
    }
  };
// ================================================================
  // ===== 🚪 LOGOUT NUCLEAR (BORRADO TOTAL) 🚪 =====
  // ================================================================
  const handleLogout = () => {
    // 1. Limpieza agresiva: Borra TODO el almacenamiento local y de sesión
    localStorage.clear(); 
    sessionStorage.clear();

    // 2. Forzar recarga desde la raíz (para evitar caché)
    window.location.href = '/'; 
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

  // 🧹 FUNCIÓN: CERRAR Y LIMPIAR EL FORMULARIO
  const handleCloseCreateModal = () => {
    // 1. Borramos la memoria
    setNewNombreCentro(''); 
    setNewCasos([{ tipo_servicio: '', descripcion: '', files: [] }]); 
    setError(''); 

    // 2. Cerramos la ventana
    setShowCreateForm(false);
  };
// 📨 FUNCIÓN: SOLICITAR ALTA (VERSIÓN "CRACKER" 🔓)
  const handleSolicitarAlta = async () => {
    
    // 1. OBTENEMOS LA LLAVE MAESTRA (TOKEN)
    const token = localStorage.getItem('authToken'); // 👈 Esto es lo que vimos en tu foto

    if (!token) {
        alert("⚠️ Error Crítico: No tienes sesión activa (Falta Token).");
        return;
    }

    // 2. ABRIMOS LA CAJA FUERTE (DECODIFICAMOS EL TOKEN MANUALMENTE)
    let user = null;
    try {
        // Truco para leer el Token sin librerías externas
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        user = JSON.parse(jsonPayload); // ¡AQUÍ ESTÁ TU USUARIO! 👤
        
        // A veces el ID viene como 'sub' o 'userId' en el token. Aseguramos el ID.
        if (!user.id && user.sub) user.id = user.sub; 

    } catch (e) {
        console.error("Error decodificando:", e);
        alert("⚠️ Tu sesión está dañada. Por favor sal y vuelve a entrar.");
        return;
    }

    console.log("✅ Usuario detectado desde Token:", user.username || user.email);

    // 3. VALIDACIONES NORMALES
    if (!newNombreCentro || newNombreCentro.trim() === '') {
        alert("⚠️ Escribe el nombre del centro primero.");
        return;
    }

    if (!window.confirm(`¿Solicitar crear el centro: "${newNombreCentro}"?`)) {
        return;
    }

    setIsLoading(true);

    try {
        const datosSolicitud = {
            nombreCentro: newNombreCentro, 
            asesorId: user.id, // Usamos el ID que sacamos del token
            area: 'Coordinacion Administrativa', 
            casos: [
                {
                    tipo_servicio: 'OTRO',
                    descripcion: `🔴 SOLICITUD DE ALTA: El usuario ${user.username || 'Desconocido'} solicita crear el centro "${newNombreCentro}".`,
                    imagenes: []
                }
            ]
        };

        const res = await fetch(`${API_URL}/pendientes`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Enviamos el token por si acaso el backend lo pide
            },
            body: JSON.stringify(datosSolicitud)
        });

        if (!res.ok) throw new Error("Error de conexión al guardar.");

        alert(`✅ ¡Listo! Solicitud enviada correctamente.`);
        handleCloseCreateModal(); 
        
        // Recarga suave para ver la tarea
        window.location.reload();

    } catch (error: any) {
        alert("❌ Error: " + error.message);
    } finally {
        setIsLoading(false);
    }
  };
// --- 7. FUNCIÓN DE ENVÍO (Submit) - VERSIÓN BLINDADA CON CANDADO 🔒 ---
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // =================================================================
    // 🔒 CANDADO DE SEGURIDAD (ANTI-HUÉRFANOS) 🔒
    // =================================================================
    
    // 1. Validar que no esté vacío
    if (!newNombreCentro || newNombreCentro.trim() === '') {
        alert("⚠️ El nombre del centro es obligatorio.");
        return;
    }

    // 2. LA VERIFICACIÓN MAESTRA:
    // Buscamos si el nombre escrito coincide EXACTAMENTE con alguno de la lista real.
    // (Usamos 'listaCentros' que es tu base de datos real cargada en memoria)
    const centroExisteRealmente = listaCentros.find(
        c => c.nombre.trim().toLowerCase() === newNombreCentro.trim().toLowerCase()
    );

    if (!centroExisteRealmente) {
        alert(
            "🛑 ACCIÓN DENEGADA: Centro no válido.\n\n" +
            "El nombre '" + newNombreCentro + "' no existe en el sistema.\n\n" +
            "👉 SOLUCIÓN:\n" +
            "1. Borra el texto y selecciona de la lista desplegable.\n" +
            "2. Si no aparece, PRESIONA EL BOTÓN ROJO 'Solicitar Crear Centro'."
        );
        return; // 🧱 AQUÍ SE FRENA TODO. No guarda nada basura.
    }
    // =================================================================

    setIsLoading(true);

    // Validación básica de descripciones vacías
    if (newCasos.some((caso) => caso.descripcion.trim() === '')) {
      setError('Todos los casos deben tener una descripción.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. CORRECCIÓN AQUI: Agregamos 'tipo_servicio' a la definición del array
      const casosParaEnviar: { descripcion: string; imagenes: string[]; tipo_servicio?: string }[] = [];

      // --- PASO A: Subir archivos ---
      for (const caso of newCasos) {
        let nombresDeArchivosSubidos: string[] = [];

        if (caso.files.length > 0) {
          const formData = new FormData();
          caso.files.forEach((file) => {
            formData.append('files', file);
          });

          // Nota: El await aquí está correcto porque la función padre es async
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
        // 2. CORRECCIÓN AQUI: Guardamos el tipo_servicio que seleccionaste en el menú
        casosParaEnviar.push({
          descripcion: caso.descripcion,
          tipo_servicio: (caso as any).tipo_servicio, // 👈 ¡ESTA ES LA LÍNEA MÁGICA!
          imagenes: nombresDeArchivosSubidos,
        });
      }

      // --- PASO B: Crear el Proyecto (Pendiente) ---
      // Mantenemos tu lógica original de decodificar el token
      const decodedToken: any = jwtDecode(token); // 'any' por si acaso faltan tipos
      const asesorId = decodedToken.sub;

      const body = {
        nombreCentro: newNombreCentro, // Usamos tu variable original
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
      
      handleCloseCreateModal(); 
      
      // Recarga segura según tu lógica
      if (userRole) fetchPendientes(userRole);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };
 // --- FUNCIÓN DE TRANSFERENCIA (CON FIRMA DE AUTOR) ---
  const handleTransferir = async () => {
    if (!transferDestino) {
      alert("⚠️ Por favor selecciona un destino primero.");
      return;
    }

    try {
      // 👇 LÍNEA NUEVA: Obtenemos tu ID desde el token
      const decodedToken: any = jwtDecode(token);
      const miUsuarioId = decodedToken.sub;

      const response = await fetch(`${API_URL}/pendientes/${viewingTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          colaboradorAsignadoId: Number(transferDestino), 
          status: 'Pendiente',
          // 👇 LÍNEA NUEVA: Enviamos tu ID al servidor
          autorId: miUsuarioId, 
          notaTransferencia: 'Transferencia manual desde Dashboard' 
        }),
      });

      if (!response.ok) throw new Error('Error al transferir la tarea');

      alert("✅ Tarea transferida correctamente.");
      setViewingTask(null);
      setTransferDestino('');
      
      if (userRole) fetchPendientes(userRole);

    } catch (error) {
      console.error(error);
      alert("❌ No se pudo transferir la tarea.");
    }
  };
  // ==========================================
  // 🚦 FUNCIONES DE CONTROL DE CALIDAD Y FLUJO
  // ==========================================

  // 1. EL COLABORADOR TERMINA -> ENVÍA A REVISIÓN
  const handleEnviarARevision = async (task: any) => {
    if (!confirm('¿Confirmas que has terminado el trabajo y deseas solicitar revisión?')) return;

    try {
      const response = await fetch(`${API_URL}/pendientes/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'En Revisión', // Cambio de estado clave
          historial: [
            ...(task.historial || []), // Mantenemos la historia previa
            {
              fecha: new Date(),
              autor: user?.username || 'Colaborador',
              accion: 'Solicitud Revisión',
              nota: 'El colaborador ha marcado la tarea como lista para validación.'
            }
          ]
        }),
      });

      if (!response.ok) throw new Error('Error al enviar a revisión');

      setSuccess('¡Excelente! Tu trabajo ha sido enviado a revisión.');
      setViewingTask(null); // Cerramos ventana
      if (userRole) fetchPendientes(userRole); // Recargamos tabla

    } catch (err: any) {
      setError('No se pudo enviar la solicitud.');
      console.error(err);
    }
  };

  // 2. LA COORDINADORA APRUEBA -> CIERRA EL TICKET
  const handleAprobar = async (task: any) => {
    if (!confirm('¿Confirmas que la calidad es óptima y deseas CERRAR este ticket?')) return;

    try {
      const response = await fetch(`${API_URL}/pendientes/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'Concluido', // Estado final
          historial: [
            ...(task.historial || []),
            {
              fecha: new Date(),
              autor: user?.username || 'Coordinador',
              accion: 'Aprobado ✅',
              nota: 'Calidad verificada. Ticket cerrado exitosamente.'
            }
          ]
        }),
      });

      if (!response.ok) throw new Error('Error al aprobar');

      setSuccess('¡Ticket aprobado y archivado!');
      setViewingTask(null);
      if (userRole) fetchPendientes(userRole);

    } catch (err: any) {
      setError('Error al intentar aprobar.');
    }
  };

  // 3. LA COORDINADORA RECHAZA -> DEVUELVE AL COLABORADOR
  const handleDevolver = async (task: any) => {
    // Pedimos el motivo obligatorio
    const motivo = prompt("⚠️ Escribe la razón de la devolución (Correcciones necesarias):");
    if (!motivo) return; // Si cancela o lo deja vacío, no hacemos nada

    try {
      const response = await fetch(`${API_URL}/pendientes/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'Pendiente', // Reactivamos la tarea para que el colaborador la vea
          historial: [
            ...(task.historial || []),
            {
              fecha: new Date(),
              autor: user?.username || 'Coordinador',
              accion: 'Rechazado ⛔',
              nota: `DEVOLUCIÓN: ${motivo}` // Guardamos el regaño/corrección
            }
          ]
        }),
      });

      if (!response.ok) throw new Error('Error al devolver');

      setSuccess('Tarea devuelta al colaborador para correcciones.');
      setViewingTask(null);
      if (userRole) fetchPendientes(userRole);

    } catch (err: any) {
      setError('Error al devolver la tarea.');
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
  // ================================================================
  // ===== 🗑️ FUNCIÓN DE BORRADO (SOLO ADMIN) - DIRECTA 🗑️ =====
  // ================================================================
  const handleDelete = async (id: number) => {
    // 1. Pregunta de seguridad simple
    if (!window.confirm(`⚠️ PELIGRO: ¿Estás seguro de ELIMINAR la tarea #${id}?\n\nEsta acción borrará todo el historial y no se puede deshacer.`)) {
        return; // Si dice "Cancelar", no hacemos nada
    }

    try {
      const res = await fetch(`${API_URL}/pendientes/${id}`, {
        method: 'DELETE',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
      });

      if (!res.ok) {
        throw new Error('No se pudo eliminar el proyecto.');
      }

      // 2. Éxito
      setSuccess(`Proyecto #${id} eliminado correctamente.`);
      fetchPendientes(); // Recargamos la tabla

    } catch (err: any) {
      setError(err.message);
    }
  };
// ================================================================
  // ===== ⚡ FUNCIÓN MAESTRA 2.0: GUARDAR Y REFRESCAR TODO ⚡ =====
  // ================================================================
  const handleUpdateCasoDirecto = async (casoId: number, campo: 'estado' | 'responsable' | 'comentario', valor: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // 1. PREPARAR DATOS
      const payload: any = {};
      if (campo === 'estado') payload.estadoId = Number(valor);
      else if (campo === 'responsable') payload.responsableId = Number(valor);
      else if (campo === 'comentario') payload.comentario = valor;

      // 2. ENVIAR AL BACKEND
      const response = await fetch(`${API_URL}/casos/${casoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Error al actualizar');

      // 3. ACTUALIZAR VISUALMENTE (Optimistic UI)
      const updatedCasos = editableCasos.map((c) => {
        if (c.id === casoId) {
          if (campo === 'estado') {
             const estadoNombre = valor === '1' ? 'Pendiente' : valor === '2' ? 'En Proceso' : valor === '3' ? 'Completado' : 'Detenido';
             return { ...c, estado: { id: Number(valor), nombre: estadoNombre } }; 
          }
          if (campo === 'responsable') {
             const nuevoResp = colaboradores.find(u => u.id === Number(valor));
             return { ...c, responsable: nuevoResp };
          }
          if (campo === 'comentario') return { ...c, comentario: valor };
        }
        return c;
      });
      setEditableCasos(updatedCasos);

      // 4. 👇 LA CLAVE: REFRESCAR LA LISTA GENERAL 👇
      // Esto hace que el cambio se guarde en la tabla grande también
      fetchPendientes(); 

    } catch (error) {
      console.error(error);
      alert('Error al guardar. Verifica tu conexión.');
    }
  };

  // 🗑️ FUNCIÓN PARA BORRAR BASURA (SOLO ADMIN)
  const handleEliminarTarea = async (idTarea: number, proyectoId: number) => {
    if (!window.confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsta acción borrará la tarea definitivamente de la base de datos.\nNo se puede deshacer.")) return;

    try {
      // Asumimos que tu backend acepta DELETE en /casos/:id
      const response = await fetch(`${API_URL}/casos/${idTarea}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Actualizamos la pantalla quitando la tarea borrada
        setPendientes(prev => prev.map(p => {
             if (p.id === proyectoId) {
                 return { ...p, casos: p.casos.filter(c => c.id !== idTarea) };
             }
             return p;
        }));
        setSuccess("🗑️ Tarea eliminada correctamente.");
      } else {
        alert("No se pudo borrar. El servidor dijo que no.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al intentar borrar.");
    }
  };
  // ================================================================
  // ===== 👨‍✈️ FUNCIÓN: ASIGNAR ENCARGADO PRINCIPAL (CAPITÁN) 👨‍✈️ =====
  // ================================================================
  const handleUpdateMainResponsible = async (nuevoId: string) => {
    if (!viewingProyecto) return;
    try {
      const token = localStorage.getItem('authToken');
      
      // 1. Enviar al Backend
      const response = await fetch(`${API_URL}/pendientes/${viewingProyecto.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ colaboradorAsignadoId: Number(nuevoId) }),
      });

      if (!response.ok) throw new Error('Error al asignar encargado');

      // 2. Actualizar visualmente el encabezado
      const updatedUser = allUsers.find(u => u.id === Number(nuevoId));
      setViewingProyecto({ ...viewingProyecto, colaboradorAsignado: updatedUser });

      // 3. Refrescar la tabla de atrás
      fetchPendientes();

    } catch (error) {
      console.error(error);
      alert('Error al asignar el encargado principal.');
    }
  };


  // ================================================================
  // ===== 👁️ 2. FUNCIÓN PARA ABRIR DETALLES (EL TIMBRE) 👁️ =====
  // ================================================================
  const handleViewDetails = (proyecto: Pendiente) => {
    setViewingProyecto(proyecto);
    setError('');
    // Copia de seguridad para editar
    if (proyecto.casos && proyecto.casos.length > 0) {
      setEditableCasos(JSON.parse(JSON.stringify(proyecto.casos)));
    } else {
      setEditableCasos([]);
    }
  };

  // ================================================================
  // ===== 📤 FUNCIÓN: SOLICITAR REVISIÓN (CORREGIDA) 📤 =====
  // ================================================================
  const handleTerminarTarea = async () => {
    if (!tareaSeleccionada) return;

    const boton = document.getElementById('btn-terminar');
    if(boton) boton.innerText = 'Enviando...';

    try {
      // 👇 1. LEEMOS EL NOMBRE DEL TOKEN (Aquí estaba el error)
      // Decodificamos el "carnet" digital para saber quién es el que da click
      const payload = JSON.parse(atob(token.split('.')[1]));
      const nombreAutor = payload.username || 'Colaborador';

      // 2. Preparamos el historial
      const nuevoHistorial = [
        ...(tareaSeleccionada.historial || []),
        {
          fecha: new Date(),
          autor: nombreAutor, // 👈 Usamos el nombre que leímos del token
          accion: 'REVISIÓN',
          nota: 'El colaborador ha terminado y solicita revisión de calidad.'
        }
      ];

      // 3. Enviamos la orden al Backend
      const res = await fetch(`${API_URL}/pendientes/${tareaSeleccionada.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'En Revisión', 
          historial: nuevoHistorial
        }),
      });

      if (!res.ok) throw new Error('Error al enviar a revisión.');

      setSuccess(`Tarea enviada a Coordinación para su revisión.`);
      setTareaSeleccionada(null); 
      fetchPendientes(); 

    } catch (err: any) {
      setError(err.message);
      if(boton) boton.innerText = 'ENVIAR A REVISIÓN';
    }
  };
  

// ================================================================
  // ===== 📺 MOTOR DE TAREAS UNIFICADO (CORREGIDO) 📺 =====
  // ================================================================
  const renderPendientesTable = (listaProyectos: Pendiente[]) => {
    
    const listaTareas: any[] = [];
    
    // 1. PROCESAMIENTO DE TAREAS (FILTRO DE 3 CANALES)
    listaProyectos.forEach(proyecto => {
      if (proyecto.casos && proyecto.casos.length > 0) {
        proyecto.casos.forEach(caso => {
          
          const estadoActual = caso.estado?.nombre || 'Pendiente';

          // 🚦 DEFINICIÓN DE BANDOS
          const esTrabajoActivo = estadoActual === 'Pendiente' || estadoActual === 'En Proceso' || estadoActual === 'Asignado';
          const esParaRevision  = estadoActual === 'Resuelto' || estadoActual === 'Resuelto (Listo)'; 
          const esArchivado     = estadoActual === 'Detenido' || estadoActual === 'Concluido'; // Usamos ID 4 (Detenido)

          // 📺 LÓGICA DE CANALES (OBEDECE AL BOTÓN DEL HEADER)
          if (modoVista === 'normal') {
             if (!esTrabajoActivo) return; // Solo activos
          } 
          else if (modoVista === 'revision') {
             if (!esParaRevision) return; // Solo para revisar
          }
          else if (modoVista === 'historial') {
             if (!esArchivado) return; // Solo archivados
          }

          // Si pasó el filtro, lo agregamos...
          listaTareas.push({
            tipo: 'tarea',
            id: caso.id,
            proyectoId: proyecto.id,
            nombreCentro: proyecto.nombreCentro,
            descripcion: caso.descripcion, 
            estado: estadoActual, 
            fecha: caso.fechaCreacion,
            responsable: proyecto.colaboradorAsignado?.username || 'Sin Asignar',
            asesor: proyecto.asesor?.username || 'Sin Asesor',
            originalData: proyecto,
            casoOriginal: caso
          });
        });
      }
    });
    const tareasUrgentes = filteredPendientes.filter(t => t.status === 'En Revisión');
    const tareasGenerales = filteredPendientes.filter(t => t.status !== 'En Revisión');

  // ================================================================
  // ===== 🚀 INICIO DEL RENDERIZADO JSX (HEADER PRO) 🚀 =====
  // ================================================================

  if (showMarketing) {
    return <MarketingPanel onBack={() => setShowMarketing(false)} />;
  }
  
return (
    // CONTENEDOR CENTRADO Y LIMPIO
    <div className="container py-4" style={{ backgroundColor: '#f5f7f9', minHeight: '100vh', maxWidth: '1600px' }}>
      
      {/* ======================================================= */}
      {/* 🚀 BARRA SUPERIOR (HEADER) - FINAL Y LIMPIA 🚀 */}
      {/* ======================================================= */}
      <Card className="shadow-sm border-0 mb-4 bg-white rounded-4 overflow-hidden">
        <Card.Body className="py-3 px-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            
            {/* 1. IZQUIERDA: LOGO E IDENTIDAD */}
            <div className="d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3 text-primary">
                 <i className="bi bi-grid-fill fs-4"></i>
              </div>
              <div>
                <h4 className="m-0 fw-bold text-dark">LA TORRE</h4>
                <small className="text-muted">Panel de Control General</small>
              </div>
            </div>

            {/* 2. DERECHA: HERRAMIENTAS */}
            <div className="d-flex align-items-center gap-2">
{/* ================================================================================= */}
              {/* 🔒 ZONA SEGURA: BOTÓN DE IMPRIMIR INVENTARIO (MODO ESTRICTO) */}
              {/* ================================================================================= */}
              {(user?.rol === 'Administrador' || user?.rol === 'Coordinador') && (
                <Button 
                    variant="outline-dark" 
                    className="me-2 d-flex align-items-center shadow-sm"
                    title="Imprimir SOLO lo Pendiente de Inventario"
                    onClick={() => {
                        // 1. EL COLADOR BLINDADO 🛡️
                        const tareasDeInventario = pendientesFiltrados.filter(p => {
                            // A. LIMPIEZA DE DATOS (Convertimos a minúsculas para no fallar)
                            const nombre = (p.nombreCentro || '').toLowerCase().trim();
                            const estado = (p.status || '').toLowerCase().trim();
                            const esArchivado = !!p.archivado; // Forzamos a verdadero/falso

                            // B. CHEQUEO DE DEPARTAMENTO
                            const esInventario = nombre.includes('inventario') || nombre.includes('insumos');

                            // C. CHEQUEO DE ESTADO (LA REGLA DE ORO)
                            // Solo aceptamos lo que diga "pendiente" o "por asignar".
                            // Todo lo demás (Aprobado, Concluido, En Revisión, Rechazado) se queda FUERA.
                            const estaVivo = estado === 'pendiente' || estado === 'por asignar';

                            return esInventario && estaVivo && !esArchivado;
                        });

                        // Si el filtro fue tan estricto que no quedó nada, avisamos
                        if (tareasDeInventario.length === 0) {
                            alert("✅ Todo limpio.\n\nNo encontré ningun pedido de Inventario con estado 'Pendiente'.");
                            return;
                        }

                        // 2. GENERAR EL PDF
                        const contenido = tareasDeInventario.map(p => {
                            const desc = p.casos && p.casos.length > 0 ? p.casos[0].descripcion : 'Ver detalle en sistema';
                            const solicitante = p.asesor?.username || 'Usuario';
                            
                            return `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px;">${p.id}</td>
                                    <td style="padding: 8px;">
                                        <strong>${p.nombreCentro}</strong><br>
                                        <small style="color:#666">Area: ${p.area || 'General'}</small><br>
                                        <small style="color:#888">Solicita: ${solicitante}</small>
                                    </td>
                                    <td style="padding: 8px; font-size: 0.95rem;">${desc}</td>
                                    <td style="padding: 8px;">${new Date(p.fechaCreacion).toLocaleDateString()}</td>
                                </tr>
                            `;
                        }).join('');

                        const ventanaImpresion = window.open('', 'PRINT', 'height=800,width=900');
                        if (ventanaImpresion) {
                            ventanaImpresion.document.write(`
                                <html>
                                <head>
                                    <title>Pendientes de Inventario</title>
                                    <style>
                                        body { font-family: sans-serif; padding: 40px; }
                                        table { width: 100%; border-collapse: collapse; }
                                        th { text-align: left; border-bottom: 2px solid #000; padding: 10px; background: #f0f0f0; }
                                        h1 { text-align: center; margin-bottom: 5px; }
                                        .watermark { position: fixed; bottom: 10px; right: 10px; color: #ccc; font-size: 0.8rem; }
                                    </style>
                                </head>
                                <body>
                                    <h1>📦 PENDIENTES DE INVENTARIO</h1>
                                    <p style="text-align:center; color:#666">Reporte filtrado: Solo ítems activos</p>
                                    <br>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Origen</th>
                                                <th>Detalle</th>
                                                <th>Fecha</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${contenido}
                                        </tbody>
                                    </table>
                                    <div class="watermark">Generado por Sistema PCOE</div>
                                </body>
                                </html>
                            `);
                            ventanaImpresion.document.close();
                            ventanaImpresion.focus();
                            ventanaImpresion.print();
                        }
                    }}
                >
                    <i className="bi bi-printer-fill me-2"></i> Imprimir Inventario
                </Button>
              )}
                
              {/* A. BOTÓN NUEVO (VISIBLE PARA TODOS - VITAL PARA OPERACIONES INTERNAS) */}
<Button 
  variant="primary" 
  className="shadow-sm fw-bold px-4 rounded-pill me-2"
  onClick={() => setShowCreateForm(true)}
>
  <i className="bi bi-plus-lg me-2"></i> Nuevo
</Button>
              

              {/* SEPARADOR */}
              <div className="vr d-none d-md-block mx-2 opacity-25" style={{ height: '30px' }}></div>

              {/* Activos (Lo cambiamos a 'activos' para que coincida con el filtro) */}
              <Button 
                variant={modoVista === 'activos' ? "primary" : "outline-secondary"}
                className="rounded-pill fw-bold px-4 border-0"
                onClick={() => setModoVista('activos')}
              >
                <i className="bi bi-list-task me-2"></i> Activos
              </Button>

              {/* Historial */}
              <Button 
                variant={modoVista === 'historial' ? "secondary" : "outline-secondary"}
                className="rounded-pill fw-bold px-4 ms-2"
                onClick={() => setModoVista('historial')}
              >
                <i className="bi bi-archive-fill me-2"></i> Historial
              </Button>

              {/* D. BOTONES DE ADMIN (SOLO JEFES) */}
              {(userRole === 'Administrador' || userRole === 'Coordinador') && (
                <>
                  <div className="vr d-none d-md-block mx-2 opacity-25" style={{ height: '30px' }}></div>
                  <div className="d-none d-md-flex align-items-center gap-2">
                    
                    {/* Botón Usuarios (Solo Admin) */}
                    {userRole === 'Administrador' && (
                      <Button variant="outline-dark" className="fw-bold px-3 rounded-pill" onClick={() => setView('admin')}>
                          <i className="bi bi-people-fill me-2"></i> Usuarios
                      </Button>
                    )}

                    {/* Botón GESTIÓN DE CENTROS (El Protagonista) */}
                    <Button 
                      variant="primary" 
                      className="fw-bold px-3 rounded-pill shadow-sm" 
                      style={{background: '#2c3e50', borderColor: '#2c3e50'}}
                      onClick={() => setShowAdminCentros(true)} 
                    >
                      <i className="bi bi-building-gear me-2"></i> Gestión Centros
                    </Button>
                  </div>
                </>
              )}
              {/* SEPARADOR FINAL */}
              <div className="vr d-none d-md-block mx-2 opacity-25" style={{ height: '30px' }}></div>

              {/* E. PERFIL Y SALIR (SIEMPRE VISIBLES) */}
              <div className="text-end me-2 d-none d-lg-block" style={{lineHeight: '1.2'}}>
                <small className="d-block text-muted" style={{fontSize: '0.7rem'}}>ROL</small>
                <strong className="text-dark">{userRole || 'Admin'}</strong>
              </div>

              {/* Botón Salir (CONECTADO Y LIMPIO) */}
              <Button 
                variant="outline-danger" 
                size="sm" 
                className="d-flex align-items-center gap-2 px-3 rounded-pill" 
                onClick={handleLogout} 
                title="Cerrar Sesión"
              >
                 <i className="bi bi-box-arrow-right fs-6"></i>
                 <span className="fw-bold">Salir</span>
              </Button>

              {/* 👇 SOLO ADMIN Y COORDINADOR PUEDEN VER ESTO 👇 */}
            {(user?.rol === 'Administrador' || user?.rol === 'Coordinador') && (
              <Button 
                  variant="purple" 
                  className="ms-2 text-white shadow-sm fw-bold" 
                  style={{ backgroundColor: '#6f42c1', borderColor: '#6f42c1' }} 
                  onClick={() => setView('central-activaciones')}
              >
                  <i className="bi bi-calendar-event-fill me-2"></i>
                  Central de Activaciones
              </Button>
            )}

            </div>

          </div>
        </Card.Body>
      </Card>
      
      {/* ALERTAS */}
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{typeof error === 'string' ? error : 'Error'}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
      
      <hr className="d-none" />
      {/* ======================================================= */}
      {/* 📊 MODAL: GESTIÓN MAESTRA (CON BALANCE REAL Y FILTRO) 🧠 */}
      {/* ======================================================= */}
      <Modal show={showAdminCentros} onHide={() => setShowAdminCentros(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-primary text-white">
            <Modal.Title><i className="bi bi-building-gear me-2"></i> Gestión Maestra de Centros</Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="bg-light">
            
            {/* 1. MONITOR DE CARGA REAL (CALCULADO AUTOMÁTICAMENTE) */}
            <div className="mb-4">
                <div className="d-flex justify-content-between align-items-end mb-2">
                    <h6 className="fw-bold text-secondary m-0">⚖️ Balance de Carga (Click para filtrar)</h6>
                    {filtroPadre && (
                        <Button variant="link" size="sm" className="text-decoration-none text-danger p-0" onClick={() => setFiltroPadre('')}>
                            <i className="bi bi-x-circle"></i> Quitar filtro
                        </Button>
                    )}
                </div>
                
                <div className="d-flex gap-3 flex-wrap">
                    {/* Tarjeta "TODOS" */}
                    <div 
                        onClick={() => setFiltroPadre('')}
                        className={`p-3 rounded shadow-sm border ${filtroPadre === '' ? 'bg-primary text-white' : 'bg-white border-primary'} cursor-pointer`}
                        style={{minWidth: '120px', cursor: 'pointer', transition: 'all 0.2s'}}
                    >
                        <small className="d-block text-uppercase opacity-75" style={{fontSize: '0.7rem'}}>Total Centros</small>
                        <strong className="fs-4">{listaCentros.length}</strong>
                    </div>

                    {/* Tarjetas por PERSONA (Calculado dinámicamente) */}
                    {Object.entries(listaCentros.reduce((acc, c) => {
                        const nombre = c.padre || 'Sin Asignar';
                        acc[nombre] = (acc[nombre] || 0) + 1;
                        return acc;
                    }, {})).map(([nombre, cantidad]) => (
                        <div 
                            key={nombre}
                            onClick={() => setFiltroPadre(nombre === 'Sin Asignar' ? '' : nombre)} // Truco para filtrar
                            className={`p-3 rounded shadow-sm border border-start-0 border-top-0 border-end-0 border-3 ${filtroPadre === nombre ? 'bg-primary text-white border-white' : 'bg-white border-primary'} cursor-pointer`}
                            style={{minWidth: '150px', cursor: 'pointer'}}
                        >
                            <small className={`d-block text-uppercase ${filtroPadre === nombre ? 'text-white-50' : 'text-muted'}`} style={{fontSize: '0.7rem'}}>
                                {nombre === 'Sin Asignar' ? '⚠️ Pendientes' : 'Padre / Guardián'}
                            </small>
                            <div className="d-flex justify-content-between align-items-center">
                                <strong className="fs-5">{nombre}</strong>
                                <span className="badge bg-white text-dark rounded-pill">{cantidad as number}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="m-0 fw-bold text-primary">
                            {filtroPadre ? `Centros de: ${filtroPadre}` : 'Listado Completo'}
                        </h6>
                        
                        <Button variant="success" onClick={() => {
                            setNewCentroNombre(busquedaCentro || ''); 
                            setNewCentroTipo('cliente');
                            setNewCentroAsesor('');
                            setNewCentroPadre(filtroPadre || ''); // Si hay filtro, pre-llenar el padre
                            setNewCentroTio('');
                            setEditingId(null);
                            setError(''); 
                            setShowCrearCentroModal(true);
                        }}>
                            <i className="bi bi-plus-lg me-2"></i> Registrar Nuevo
                        </Button>
                    </div>

                    <div className="input-group">
                        <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                        <input 
                            type="text" 
                            className="form-control border-start-0" 
                            placeholder="🔍 Buscar por nombre..." 
                            value={busquedaCentro}
                            onChange={(e) => setBusquedaCentro(e.target.value)}
                        />
                    </div>
                </Card.Header>

                <Card.Body className="p-0">
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <Table hover className="m-0 align-middle">
                            <thead className="bg-light sticky-top">
                                <tr>
                                    <th className="ps-4">Nombre del Centro</th>
                                    <th>Asesor</th>
                                    <th>Padre (Guardián)</th>
                                    <th>Tío (Marketing)</th>
                                    <th className="text-end pe-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                               {listaCentros
                                    .filter(c => {
                                        // 1. Filtro por Texto
                                        const coincideTexto = c.nombre.toLowerCase().includes(busquedaCentro.toLowerCase());
                                        // 2. Filtro por Padre (Botones de arriba)
                                        const coincidePadre = filtroPadre === '' || c.padre === filtroPadre;
                                        return coincideTexto && coincidePadre;
                                    })
                                    .map((centro, index) => (
                                        <tr key={centro.id || index}>
                                            <td className="ps-4 fw-bold text-dark">{centro.nombre}</td>
                                            <td>{centro.asesor || '-'}</td>
                                            <td>
                                                {centro.padre ? (
                                                    <span className={`badge ${filtroPadre === centro.padre ? 'bg-warning text-dark' : 'bg-primary bg-opacity-10 text-primary'} border border-primary rounded-pill`}>
                                                        {centro.padre}
                                                    </span>
                                                ) : <span className="text-muted small">Sin Asignar</span>}
                                            </td>
                                            <td>{centro.tio || '-'}</td>
                                            
                                            <td className="text-end pe-4">
                                                <div className="d-flex justify-content-end gap-2">
                                                    {/* BOTÓN 1: EDITAR (Restaurado) ✏️ */}
                                                    <Button 
                                                        variant="outline-primary" size="sm" 
                                                        onClick={() => {
                                                            setEditingId(centro.id);
                                                            setNewCentroNombre(centro.nombre);
                                                            setNewCentroTipo(centro.tipo || 'cliente');
                                                            setNewCentroAsesor(centro.asesor || '');
                                                            setNewCentroPadre(centro.padre || '');
                                                            setNewCentroTio(centro.tio || '');
                                                            setShowCrearCentroModal(true);
                                                        }}
                                                        title="Editar Centro"
                                                    >
                                                        <i className="bi bi-pencil-square"></i>
                                                    </Button>

                                                    {/* BOTÓN 2: BORRAR (El Corregido) 🗑️ */}
                                                    <Button 
                                                        variant="outline-danger" size="sm"
                                                        onClick={async () => {
                                                            if (confirm(`🛑 ¿Seguro que deseas borrar "${centro.nombre}"?`)) {
                                                                try {
                                                                    const res = await fetch(`https://sistema-pendientes.onrender.com/marketing/admin/centro/${centro.id}`, { method: 'DELETE' });
                                                                    
                                                                    if (res.ok) {
                                                                        setListaCentros(prev => prev.filter(c => c.id !== centro.id));
                                                                        alert("✅ Centro eliminado.");
                                                                    } else {
                                                                        const errorData = await res.json().catch(() => ({ message: "Error desconocido" }));
                                                                        alert(`❌ No se pudo borrar:\n${errorData.message}`);
                                                                    }
                                                                } catch (err) { 
                                                                    console.error(err);
                                                                    alert("Error de conexión.");
                                                                }
                                                            }
                                                        }}
                                                        title="Borrar Centro"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                               ))}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAdminCentros(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
      {/* ======================================================= */}
      {/* 📝 FORMULARIO: REGISTRAR NUEVO CENTRO (CONECTADO A allUsers) 📝 */}
      {/* ======================================================= */}
      <Modal show={showCrearCentroModal} onHide={() => setShowCrearCentroModal(false)} backdrop="static" centered>
        <Modal.Header closeButton>
            <Modal.Title>Registrar Nuevo Centro</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light">
          {error && <Alert variant="danger" className="mb-3 animate__animated animate__shakeX">{error}</Alert>}
            <Form>
                {/* 1. EL NOMBRE */}
                <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Nombre del Centro / Departamento</Form.Label>
                    <Form.Control 
                        type="text" 
                        value={newCentroNombre} 
                        onChange={(e) => setNewCentroNombre(e.target.value)} 
                        autoFocus 
                        placeholder="Ej: Colegio San Pedro o Taller de Impresión"
                    />
                </Form.Group>

                {/* 2. TIPO DE LUGAR */}
                <div className="mb-4 p-3 bg-white rounded border shadow-sm">
                    <Form.Label className="small text-muted fw-bold text-uppercase mb-2 d-block">¿Qué tipo de lugar es?</Form.Label>
                    <div className="d-flex gap-3">
                        <Form.Check 
                            type="radio"
                            id="tipo-cliente"
                            label="🏫 Cliente (Centros)"
                            name="tipoCentro"
                            checked={newCentroTipo === 'cliente'}
                            onChange={() => setNewCentroTipo('cliente')}
                            className="fw-bold text-primary"
                        />
                        <Form.Check 
                            type="radio"
                            id="tipo-interno"
                            label="🏢 Depto. Interno"
                            name="tipoCentro"
                            checked={newCentroTipo === 'interno'}
                            onChange={() => setNewCentroTipo('interno')}
                            className="fw-bold text-secondary"
                        />
                    </div>
                </div>

                {/* 3. PADRE (TODOS LOS USUARIOS - USANDO allUsers) */}
                <Form.Group className="mb-3">
                    <Form.Label className="small text-primary fw-bold">Encargado Principal (Padre)</Form.Label>
                    <Form.Select 
                        className="border-primary bg-primary bg-opacity-10 fw-bold text-primary" 
                        value={newCentroPadre} 
                        onChange={(e) => setNewCentroPadre(e.target.value)}
                    >
                        <option value="">Seleccione al Encargado...</option>
                        {/* 👇 AQUÍ ESTÁ EL ARREGLO: allUsers 👇 */}
                        {allUsers && allUsers.map(u => (
                            <option key={u.id} value={u.username}>
                                {u.nombreCompleto || u.username} ({u.rol})
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>

                {/* 4. CAMPOS CONDICIONALES */}
                {newCentroTipo === 'cliente' && (
                    <div className="ps-3 border-start border-3 border-info">
                        <Form.Group className="mb-3 animate__animated animate__fadeIn">
                            <Form.Label className="small text-muted fw-bold">Asesor de Ventas</Form.Label>
                            <Form.Select value={newCentroAsesor} onChange={(e) => setNewCentroAsesor(e.target.value)}>
                                <option value="">Seleccione...</option>
                                {/* 👇 FILTRO ASESOR con allUsers 👇 */}
                                {allUsers && allUsers.filter(u => u.rol === 'Asesor').map(u => (
                                    <option key={u.id} value={u.username}>
                                        {u.nombreCompleto || u.username}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3 animate__animated animate__fadeIn">
                            <Form.Label className="small text-muted fw-bold">Marketing (Tío)</Form.Label>
                            <Form.Select value={newCentroTio} onChange={(e) => setNewCentroTio(e.target.value)}>
                                <option value="">Seleccione...</option>
                                {/* 👇 FILTRO MARKETING con allUsers 👇 */}
                                {allUsers && allUsers.filter(u => u.departamentos && u.departamentos.includes('Marketing')).map(u => (
                                    <option key={u.id} value={u.username}>
                                        {u.nombreCompleto || u.username}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </div>
                )}
            </Form>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCrearCentroModal(false)}>Cancelar</Button>
            <Button variant="success" onClick={handleGuardarCentro}>
                Guardar Configuración
            </Button>
        </Modal.Footer>
      </Modal>
{/* ================================================================ */}
      {/* 📝 MODAL: NUEVA SOLICITUD (CORREGIDO Y BOTÓN ARRIBA) 📝 */}
      {/* ================================================================ */}
      <Modal show={showCreateForm} onHide={handleCloseCreateModal} size="lg" backdrop="static">
        <Form onSubmit={handleCreateSubmit}>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title className="fw-bold">
                    <i className="bi bi-file-earmark-plus me-2"></i>
                    Crear Nueva Solicitud
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="bg-light p-4"> 

                {/* Alerta de error */}
                {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

                {/* --- SECCIÓN 1: IDENTIFICACIÓN DEL CLIENTE --- */}
                <div className="bg-white p-4 rounded shadow-sm mb-4 border-start border-4 border-primary">
                    
                    {/* 🟢 CORRECCIÓN: Título y Botón Rojo en la misma línea superior */}
                    {/* Esto evita que la lista desplegable tape el botón */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-dark m-0">1. ¿Para quién es el trabajo?</h6>
                        
                        <Button 
                            variant="danger" 
                            size="sm" 
                            className="fw-bold shadow-sm"
                            onClick={handleSolicitarAlta}
                            title="Presiona aquí si el nombre que escribes no aparece en la lista"
                        >
                            <i className="bi bi-plus-circle me-1"></i>
                            Solicitar Crear Centro
                        </Button>
                    </div>
                    
                    <Form.Group className="mb-2">
                        <Form.Label className="fw-bold text-secondary small text-uppercase">Centro o Departamento Solicitante</Form.Label>
                        
                        {/* BUSCADOR QUE NO SE BORRA AL SALIR */}
                        <Select
                            className="basic-single"
                            classNamePrefix="select"
                            isClearable={true}
                            isSearchable={true}
                            name="centro"
                            placeholder="🔍 Escribe el nombre aquí..."
                            
                            options={centroOptions}
                            
                            // Valor seleccionado
                            value={centroOptions.find(op => op.value === newNombreCentro) || null}
                            onChange={(option) => setNewNombreCentro(option ? option.value : '')}
                            
                            // 🧠 Capturamos lo que escribes para el botón de solicitar
                            onInputChange={(newValue, actionMeta) => {
                                if (actionMeta.action === 'input-change') {
                                    setNewNombreCentro(newValue);
                                }
                            }}
                            
                            // Mensaje dentro de la lista
                            noOptionsMessage={({ inputValue }) => inputValue ? `👆 No existe. Usa el botón rojo de arriba.` : "Escribe para buscar..."}
                            
                            styles={{
                                control: (base) => ({ ...base, minHeight: '50px', fontSize: '1.1rem' }),
                                menu: (base) => ({ ...base, zIndex: 9999 }) // Flota sobre todo
                            }}
                        />
                        <Form.Text className="text-muted small">
                            * Escribe el nombre. Si no sale en la lista, presiona el botón rojo de arriba.
                        </Form.Text>
                    </Form.Group>
                </div>

                {/* --- SECCIÓN 2: REQUERIMIENTOS --- */}
                <div className="bg-white p-4 rounded shadow-sm border-start border-4 border-secondary">
                    <h6 className="fw-bold text-dark mb-3">2. Detalle de la Solicitud</h6>

                    <ListGroup variant="flush" className="mb-3">
                        {newCasos.map((caso, index) => {
                            const esOtro = (caso as any).tipo_servicio === 'OTRO';
                            return (
                                <ListGroup.Item key={index} className="p-3 mb-3 border rounded bg-light">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="badge bg-secondary">Ítem #{index + 1}</span>
                                        {newCasos.length > 1 && (
                                            <i className="bi bi-x-circle-fill text-danger fs-5" style={{cursor:'pointer'}} onClick={() => handleRemoveCaso(index)}></i>
                                        )}
                                    </div>

                                    <Row className="g-2">
                                        <Col md={5}>
                                            <Form.Select
                                                required
                                                value={(caso as any).tipo_servicio || ''}
                                                onChange={(e) => {
                                                    const newC = [...newCasos];
                                                    (newC[index] as any).tipo_servicio = e.target.value;
                                                    setNewCasos(newC);
                                                }}
                                                className="fw-bold"
                                            >
                                                <option value="">Selecciona Servicio...</option>
                                                {listaServicios.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
                                                <option value="OTRO" className="fw-bold text-primary">⚡ OTROS / GENERAL</option>
                                            </Form.Select>
                                        </Col>
                                        <Col md={7}>
                                            <Form.Control
                                                as="textarea" rows={1}
                                                placeholder={esOtro ? "Describe detalladamente qué necesitas..." : "Detalles (Medidas, cantidad...)"}
                                                value={caso.descripcion}
                                                onChange={(e) => handleCasoChange(index, e.target.value)}
                                                required
                                                style={{resize: 'none', backgroundColor: esOtro ? '#fff3cd' : 'white'}}
                                            />
                                        </Col>
                                        <Col md={12} className="mt-2">
                                            <div className="d-flex align-items-center">
                                                <Form.Label htmlFor={`file-${index}`} className={`btn btn-sm w-100 mb-0 border-dashed ${caso.files.length > 0 ? 'btn-success' : 'btn-outline-secondary'}`}>
                                                    <i className="bi bi-paperclip me-2"></i>{caso.files.length > 0 ? `${caso.files.length} Archivos` : 'Adjuntar Referencias / Fotos'}
                                                </Form.Label>
                                                <Form.Control id={`file-${index}`} type="file" multiple className="d-none" onChange={(e: any) => handleCasoFileChange(index, e)}/>
                                            </div>
                                        </Col>
                                    </Row>
                                </ListGroup.Item>
                            );
                        })}
                    </ListGroup>

                    <Button variant="outline-primary" size="sm" onClick={handleAddCaso} className="w-100 fw-bold border-dashed">
                        <i className="bi bi-plus-lg me-2"></i> Agregar otro ítem a esta solicitud
                    </Button>
                </div>

            </Modal.Body>

            <Modal.Footer className="bg-light border-top-0">
                <Button variant="text" className="text-muted" onClick={handleCloseCreateModal}>Cancelar</Button>
                <Button variant="primary" type="submit" className="px-4 fw-bold shadow-sm" disabled={isLoading}>
                    {isLoading ? <Spinner as="span" animation="border" size="sm" /> : 
                    <>
                        <i className="bi bi-send-fill me-2"></i> Guardar Solicitud
                    </>}
                </Button>
            </Modal.Footer>
        </Form>
      </Modal>
      {/* ======================================================= */}
      {/* 🚨 ZONA DE ACCIÓN: BANDEJA DE APROBACIONES (PRIORITARIO) */}
      {/* ======================================================= */}
      {(user?.rol === 'Administrador' || user?.rol === 'Coordinador') && tareasUrgentes.length > 0 && (
        <div className="card border-warning mb-4 shadow-sm">
          <div className="card-header bg-warning bg-opacity-25 text-dark py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-bell-fill text-warning me-2"></i> 
              Requiere tu Aprobación ({tareasUrgentes.length})
            </h5>
            <span className="badge bg-warning text-dark border border-dark">Acción Inmediata</span>
          </div>
          <div className="card-body bg-warning bg-opacity-10 p-0">
            <div className="list-group list-group-flush">
              {tareasUrgentes.map((task) => (
                <div key={task.id} className="list-group-item d-flex align-items-center justify-content-between py-3 bg-transparent border-warning border-opacity-25">
                  <div className="d-flex align-items-center gap-3">
                    {/* Icono de Alerta */}
                    <div className="bg-white rounded-circle d-flex align-items-center justify-content-center text-warning shadow-sm" style={{width: 40, height: 40}}>
                      <i className="bi bi-exclamation-lg fs-4"></i>
                    </div>
                    {/* Info de la Tarea */}
                    <div>
                      <h6 className="fw-bold mb-0 text-dark">
                        {task.nombreCentro} 
                        <span className="text-muted fw-normal mx-2">|</span> 
                        <span className="text-primary">
                          {(task.casos[task.casos.length - 1] as any).tipo_servicio || 'Servicio General'}
                        </span>
                      </h6>
                      <small className="text-muted">
                        Encargado: <strong>{task.colaboradorAsignado?.username}</strong> • Esperando desde el <strong>{new Date(task.fechaAsignacion || new Date()).toLocaleDateString()}</strong> a las {new Date(task.fechaAsignacion || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </small>
                    </div>
                  </div>
                  
                  {/* Botón de Acción Rápida */}
                  <Button variant="dark" size="sm" className="px-4 fw-bold" onClick={() => setViewingTask(task)}>
                    EVALUAR <i className="bi bi-arrow-right-short"></i>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
{/* 👇 👇 INICIO DEL PANEL DE TIEMPOS (LÓGICA + DISEÑO) 👇 👇 */}
      {(() => {
        // 1. Usamos tu variable real: filteredPendientes
        if (typeof filteredPendientes === 'undefined' || !filteredPendientes) return null;

        // 2. Filtramos solo las activas
        const tareasActivas = filteredPendientes.filter((t: any) => 
          t.colaboradorAsignado && 
          (t.status === 'Pendiente' || t.status === 'En Revisión')
        );

        // 3. Calculamos quién tiene más días
        const rankingMap = new Map();
        tareasActivas.forEach((tarea: any) => {
          const nombre = tarea.colaboradorAsignado.username;
          const fechaInicio = new Date(tarea.fechaAsignacion || tarea.fechaCreacion || new Date());
          const hoy = new Date();
          const diasRetraso = Math.floor((hoy.getTime() - fechaInicio.getTime()) / (1000 * 3600 * 24));

          if (!rankingMap.has(nombre)) {
            rankingMap.set(nombre, { nombre, totalTareas: 0, maxDias: 0 });
          }
          const data = rankingMap.get(nombre);
          data.totalTareas += 1;
          if (diasRetraso > data.maxDias) data.maxDias = diasRetraso;
        });

        const rankingColaboradores = Array.from(rankingMap.values()).sort((a, b) => a.maxDias - b.maxDias);

        // Si no hay tareas activas, no mostramos el panel
        if (rankingColaboradores.length === 0) return null;

        // 4. Dibujamos el panel
        return (
          <div className="card shadow-sm mb-4 border-0">
            <div className="card-header bg-white border-bottom py-3 d-flex align-items-center">
              <h5 className="mb-0 fw-bold text-dark">
                <i className="bi bi-bar-chart-steps text-primary me-2"></i>
                Tiempos de Respuesta (Tareas Activas)
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="row g-0">
                {rankingColaboradores.map((colab, index) => {
                 // Lógica de colores visuales: 
                  // 0 a 3 días = Verde | 4 a 6 días = Naranja | 7 o más días = Rojo
                  let colorClass = "text-success";
                  let icon = "bi-check-circle-fill";
                  
                  if (colab.maxDias >= 7) {
                    colorClass = "text-danger fw-bold"; // Rojo intenso si pasa de 7 días
                    icon = "bi-exclamation-octagon-fill";
                  } else if (colab.maxDias >= 4) {
                    colorClass = "text-warning"; // Naranja de advertencia
                    icon = "bi-exclamation-triangle-fill";
                  }

                  const esElMejor = index === 0;
                  const esElPeor = index === rankingColaboradores.length - 1 && rankingColaboradores.length > 1;

                  return (
                    <div key={colab.nombre} className={`col-md-3 col-sm-6 border-end border-bottom p-3 ${esElPeor ? 'bg-danger bg-opacity-10' : ''}`}>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="fw-bold text-dark">
                          {esElMejor ? '🏆 ' : ''} {index + 1}. {colab.nombre}
                        </span>
                        <i className={`bi ${icon} ${colorClass} fs-5`}></i>
                      </div>
                      <div className="text-muted small mb-1">
                        Tareas en fila: <strong className="text-dark">{colab.totalTareas}</strong>
                      </div>
                      <div className={`small fw-bold ${colorClass}`}>
                        Peor caso: {colab.maxDias} {colab.maxDias === 1 ? 'día' : 'días'} estancado
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
      {/* 👆 👆 FIN DEL PANEL DE TIEMPOS 👆 👆 */}


{/* ======================================================= */}
{/* 🚀 TABLA FINAL LIMPIA (SIN COLUMNA EQUIPO) 🚀 */}
{/* ======================================================= */}
<div className="card shadow-sm border-0 overflow-hidden mb-5">
  {/* 1. ENCABEZADO */}
  <div className="card-header bg-primary text-white py-3 d-flex justify-content-between align-items-center">
    <h5 className="mb-0 fw-bold"><i className="bi bi-kanban me-2"></i> Proyectos Activos</h5>
    <span className="badge bg-white text-primary rounded-pill px-3">{filteredPendientes.length} En Curso</span>
  </div>

  {/* 2. CUERPO DE LA TABLA */}
  <div className="table-responsive">
    <Table hover responsive className="align-middle mb-0 bg-white">
      <thead className="bg-light text-secondary">
        <tr>
          <th className="py-3 ps-3">ID / Centro</th>
          <th>Encargado</th>
          <th style={{width: '40%'}}>Misión Actual</th> {/* Le di más espacio a la Misión */}
          <th className="text-center">Tiempo</th>
          <th className="text-center">Estado</th>
          <th className="text-center pe-3">Acción</th>
        </tr>
      </thead>
      <tbody>
        {filteredPendientes.map((item) => {
           
           // A. CÁLCULO DE TIEMPO
           const fechaBase = item.fechaAsignacion ? new Date(item.fechaAsignacion) : new Date(item.fechaCreacion);
           const diffTime = Math.abs(new Date().getTime() - fechaBase.getTime());
           const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24));
           
           // B. ALERTA DE COLORES
           let relojColor = 'bg-light text-muted border'; 
           if (dias >= 2) relojColor = 'bg-warning text-dark border-warning';
           if (dias >= 4) relojColor = 'bg-danger text-white border-danger';

           // C. ESTADO
           let etiquetaEstado = item.status;
           let bgEstado = 'secondary';
           if (item.status === 'Pendiente') bgEstado = 'warning'; 
           if (item.status === 'En Revisión') bgEstado = 'info';  
           if (item.status === 'Concluido') bgEstado = 'success'; 
           
           const esVacante = !item.colaboradorAsignado;
           if (esVacante) { etiquetaEstado = 'Por Asignar'; bgEstado = 'primary'; }

           return (
            <tr key={item.id} className="border-bottom">
              {/* 1. ID Y CENTRO */}
              <td className="ps-3">
                 <span className="text-muted small fw-bold d-block">#{item.id}</span>
                 <span className="fw-bold text-dark">{item.nombreCentro}</span>
              </td>

              {/* 2. ENCARGADO */}
              <td>
                <div className="d-flex align-items-center gap-2">
                   {!esVacante ? (
                     <>
                       <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{width: '30px', height: '30px', fontSize: '12px'}}>
                         {item.colaboradorAsignado.username.charAt(0).toUpperCase()}
                       </div>
                       <span className="fw-bold text-dark small">{item.colaboradorAsignado.username}</span>
                     </>
                   ) : (
                     <span className="badge bg-danger bg-opacity-10 text-danger border border-danger">Vacante</span>
                   )}
                </div>
              </td>

              {/* 3. MISIÓN (ESTILO GMAIL) */}
              <td>
                {item.casos && item.casos.length > 0 ? (
                    <div className="d-flex flex-column">
                        <span className="fw-bold text-primary" style={{ fontSize: '0.95rem' }}>
                            {item.casos[0].descripcion.includes(':') 
                                ? item.casos[0].descripcion.split(':')[0] 
                                : (item.casos[0].tipo_servicio || 'Misión Activa')}
                        </span>
                        <span className="text-muted small text-truncate" style={{ maxWidth: '350px' }}>
                            {item.casos[0].descripcion.includes(':') 
                                ? item.casos[0].descripcion.split(':')[1] 
                                : item.casos[0].descripcion}
                        </span>
                    </div>
                ) : (
                    <span className="text-muted fst-italic small">Sin detalles...</span>
                )}
              </td>

              {/* 4. TIEMPO */}
              <td className="text-center">
                <span className={`badge rounded-pill fw-normal ${relojColor}`} style={{minWidth: '45px'}}>
                    {dias}d
                </span>
              </td>

              {/* (COLUMNA EQUIPO BORRADA AQUÍ) 🗑️ */}

              {/* 5. ESTADO */}
              <td className="text-center"><Badge bg={bgEstado} className="fw-normal px-3">{etiquetaEstado}</Badge></td>

              {/* 7. ACCIONES (SEGURIDAD APLICADA 🔒) */}
              <td className="text-center pe-3">
                <div className="d-flex gap-2 justify-content-center">
                    
                    {/* A. BOTÓN VER (OCULTO PARA ASESORES) */}
                    {userRole !== 'Asesor' && (
                        <Button 
                            variant="outline-primary" 
                            size="sm" 
                            onClick={() => setViewingTask(item)}
                            title="Gestionar Proyecto"
                        >
                            Ver
                        </Button>
                    )}

                    {/* B. BOTÓN BORRAR (SOLO ADMIN) */}
                    {(userRole === 'Administrador' || userRole === 'admin') && (
                        <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={async () => {
                                if(confirm("¿Estás seguro de borrar este proyecto permanentemente?")) {
                                    await fetch(`${API_URL}/pendientes/${item.id}`, { method: 'DELETE' });
                                    window.location.reload();
                                }
                            }}
                            title="Eliminar del Sistema"
                        >
                            <i className="bi bi-trash"></i>
                        </Button>
                    )}

                    {/* C. MENSAJE PARA ASESOR (Opcional, para que no se vea vacío) */}
                    {userRole === 'Asesor' && (
                        <span className="text-muted small fst-italic">
                            <i className="bi bi-eye-slash me-1"></i>
                            En Proceso
                        </span>
                    )}
                </div>
              </td>
            </tr>
           );
        })}
      </tbody>
    </Table>
  </div>
  <div className="card-footer bg-light text-end text-muted small py-2">
    Mostrando {filteredPendientes.length} proyectos
  </div>
</div>
      {/* ================================================================ */}
      {/* ===== 💾 MODAL 1: ASIGNACIÓN RÁPIDA (SOLO ADMIN) 💾 ===== */}
      {/* ================================================================ */}
      <Modal show={editingPendiente !== null} onHide={() => setEditingPendiente(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Asignar Proyecto #{editingPendiente?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateSubmit}>
            {userRole === 'Administrador' && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold text-primary">Seleccionar Colaborador</Form.Label>
                <Form.Select
                  value={selectedColaboradorId}
                  onChange={(e) => setSelectedColaboradorId(e.target.value)}
                  className="form-control-lg"
                >
                  <option value="">-- Sin Asignar --</option>
                  {allUsers
                    .filter((user) => user.rol === 'Colaborador' || user.rol === 'Coordinador')
                    .map((user) => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                </Form.Select>
              </Form.Group>
            )}
            <div className="d-flex justify-content-end gap-2 mt-4 border-top pt-3">
              <Button variant="secondary" onClick={() => setEditingPendiente(null)}>Cancelar</Button>
              <Button variant="primary" type="submit">💾 Guardar Asignación</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* ================================================================ */}
      {/* ===== 🖼️ MODAL 2: VER IMÁGENES ADJUNTAS 🖼️ ===== */}
      {/* ================================================================ */}
      <Modal show={viewingImages !== null} onHide={() => setViewingImages(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Archivos Adjuntos</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center bg-dark">
          {viewingImages?.map((imageName, index) => (
            <div key={index} className="mb-3">
              <a href={`${API_URL}/pendientes/uploads/${imageName}`} target="_blank" rel="noopener noreferrer">
                <img
                  src={`${API_URL}/pendientes/uploads/${imageName}`}
                  alt={`Adjunto ${index + 1}`}
                  style={{ maxWidth: '100%', maxHeight: '500px', border: '1px solid #555' }}
                />
              </a>
              <div className="text-white small mt-1">Clic en la imagen para ver original</div>
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setViewingImages(null)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>

    
      {/* ================================================================ */}
      {/* 🗓️ MODAL: CENTRAL DE ACTIVACIONES (EL DESPERTADOR) 🗓️ */}
      {/* ================================================================ */}
      <Modal show={showActivaciones} onHide={() => setShowActivaciones(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-white border-bottom-0 pb-0">
            <div>
                <Modal.Title className="fw-bold text-primary" style={{ fontSize: '1.5rem' }}>
                    <i className="bi bi-calendar-check-fill me-2"></i>
                    Tablero de Activaciones 2025
                </Modal.Title>
                <p className="text-muted small mt-1 mb-3">
                    Aquí defines cuándo ocurren los eventos. Al guardar una fecha, el sistema activará 
                    automáticamente al <strong>Recolector</strong>, y luego al <strong>Diseño/Marketing</strong>.
                </p>
            </div>
        </Modal.Header>

        <Modal.Body className="bg-light p-4">
            
            <div className="card shadow-sm border-0 overflow-hidden">
                <div className="table-responsive">
                    <Table hover className="m-0 align-middle table-nowrap">
                        <thead className="bg-primary text-white text-uppercase small">
                            <tr>
                                <th className="py-3 ps-4" style={{minWidth: '200px'}}>Centro / Colegio</th>
                                <th className="py-3 text-center">📸 Fotos<br/>Combos</th>
                                <th className="py-3 text-center">🚀 Fotos<br/>Lanzamiento</th>
                                <th className="py-3 text-center">🌳 Fotos<br/>Exterior</th>
                                <th className="py-3 text-center">🎓 Pre<br/>Graduación</th>
                                <th className="py-3 text-center">🎉 Evento<br/>Graduación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listaCentros.map((centro, index) => (
                                <tr key={centro.id || index} className="bg-white">
                                    {/* 1. NOMBRE DEL CENTRO */}
                                    <td className="ps-4 fw-bold text-dark border-end">
                                        <div className="d-flex align-items-center">
                                            <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-2" 
                                                 style={{width:35, height:35, color: '#6f42c1', fontWeight:'bold'}}>
                                                {centro.nombre.charAt(0)}
                                            </div>
                                            {centro.nombre}
                                        </div>
                                        <div className="small text-muted ms-5 mt-1">
                                            Encargado: {centro.padre || 'Sin asignar'}
                                        </div>
                                    </td>

                                    {/* 2. LAS FECHAS (INPUTS) */}
                                    {/* Iteramos 5 veces para simular las 5 columnas de eventos */}
                                    {[1, 2, 3, 4, 5].map((evt) => (
                                        <td key={evt} className="text-center p-2">
                                            <input 
                                                type="date" 
                                                className="form-control form-control-sm text-center fw-bold border-0 bg-light"
                                                style={{cursor: 'pointer', minWidth: '130px'}}
                                                onChange={(e) => {
                                                    // AQUÍ ESTÁ EL TRUCO:
                                                    // Cuando la Coordinadora pone la fecha, aquí capturaremos el cambio.
                                                    console.log(`📅 Fecha establecida para ${centro.nombre} - Evento ${evt}:`, e.target.value);
                                                    
                                                    // LÓGICA FUTURA: 
                                                    // 1. Guardar en BD.
                                                    // 2. Disparar tarea al RECOLECTOR.
                                                }}
                                            />
                                            {/* Simulación de estado */}
                                            <span className="badge bg-secondary bg-opacity-10 text-secondary mt-1 rounded-pill" style={{fontSize: '0.65rem'}}>
                                                Sin Programar
                                            </span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </div>

        </Modal.Body>
        <Modal.Footer className="bg-light border-top-0">
            <Button variant="outline-secondary" onClick={() => setShowActivaciones(false)}>Cerrar Tablero</Button>
            <Button variant="primary"> Guardar Cambios </Button>
        </Modal.Footer>
      </Modal>

      {/* ⚠️ AQUÍ DEBES PEGAR EL VISOR MAESTRO (EL NUEVO) ⚠️ */}

      {/* ======================================================= */}
      {/* 🚀 VISOR DE TAREA MAESTRO (FOTOS + BOTONES) 🚀 */}
      {/* ======================================================= */}
      <Modal show={viewingTask !== null} onHide={() => setViewingTask(null)} centered size="xl">
          {/* ... (todo el código del visor nuevo que te di) ... */}
      </Modal>

    </div> // Cierre del Container Principal
  );
}
// ================================================================
  // 🧠 CEREBRO DE FILTROS: CORREGIDO (SIN STANDBY)
  // ================================================================

  // 1. FILTRO BASE
  let filteredPendientes = pendientes.filter((task) => {
    const esTerminada = task.status === 'Concluido' || task.status === 'Detenido';
    const esDormida = task.status === 'STANDBY'; // 👈 IDENTIFICAMOS LAS DORMIDAS

    if (modoVista === 'historial') {
      return esTerminada; // Historial: Solo lo terminado
    } else {
      // Activos: NI terminada, NI dormida (Solo lo que se puede trabajar)
      return !esTerminada && !esDormida; 
    }
  });

  // 2. FILTRO DE BÚSQUEDA
  if (typeof searchTerm !== 'undefined' && searchTerm) {
    const lower = searchTerm.toLowerCase();
    filteredPendientes = filteredPendientes.filter(t => 
      t.nombreCentro?.toLowerCase().includes(lower) || 
      t.colaboradorAsignado?.username?.toLowerCase().includes(lower)
    );
  }

  // 3. CANDADO ASESORES (LOGICA BLINDADA: POR PROPIEDAD DEL CENTRO) 🛡️
  if (modoVista === 'historial' && (userRole === 'Asesor' || user?.rol === 'Asesor')) {
      
      // PASO A: Buscamos cuáles son los Nombres de los Colegios de este Asesor
      // (Usamos tu listaCentros que ya sabemos que está correcta)
      const misCentros = listaCentros
          .filter(c => c.asesor === user.username || c.asesor === user.nombreCompleto)
          .map(c => c.nombre);

      // PASO B: Filtramos las tareas cuyo nombre de centro coincida con mis colegios
      // O si la tarea tiene mi firma directa. (Doble validación)
      filteredPendientes = filteredPendientes.filter(task => {
          const esMiColegio = misCentros.includes(task.nombreCentro);
          const soyElAsesor = task.asesor?.id == user?.id; // Doble igual por si acaso
          
          return esMiColegio || soyElAsesor;
      });
  }  
  // ================================================================
  // 👇 AQUÍ ABAJO DEBE ESTAR TU 'return (' 👇

// ==========================================
  // 🚀 EL RETURN PRINCIPAL (VERSIÓN MAESTRA FINAL & CORREGIDA)
  // ==========================================
  return (
    <div className="container-fluid py-3">
       
       
       {/* 1. LA TABLA DE TAREAS */}
       {renderPendientesTable(pendientesFiltrados)}

       {/* ======================================================= */}
       {/* 🚀 VENTANA MAESTRA: VERSIÓN "PRO COMPACTA" 🚀 */}
       {/* ======================================================= */}
       <Modal show={viewingTask !== null} onHide={() => setViewingTask(null)} centered size="xl" backdrop="static">
        {viewingTask && (
          <>
            {/* ENCABEZADO MÁS COMPACTO */}
            <Modal.Header closeButton className="bg-primary text-white border-0 py-2">
              <div className="d-flex align-items-center w-100">
                <div className="me-3 opacity-75"><i className="bi bi-folder2-open fs-4"></i></div>
                <div>
                    <h6 className="m-0 fw-bold text-uppercase" style={{letterSpacing: '1px'}}>{viewingTask.nombreCentro}</h6>
                    <small className="text-white-50" style={{fontSize: '0.75rem'}}>
                        Ticket #{viewingTask.id} • Asesor: {viewingTask.asesor?.username || 'N/A'}
                    </small>
                </div>
                <div className="ms-auto me-4">
                    <Badge bg="light" text="dark" className="shadow-sm">
                        {viewingTask.status}
                    </Badge>
                </div>
              </div>
            </Modal.Header>

            <Modal.Body className="bg-light p-0">
              <Row className="g-0">
                
                {/* 👈 COLUMNA IZQUIERDA: ORDEN DE TRABAJO (COMPACTA) */}
                <Col lg={8} className="bg-white d-flex flex-column" style={{height: '70vh'}}>
                  
                  {/* TÍTULO DE SECCIÓN */}
                  <div className="px-4 py-3 border-bottom bg-light d-flex justify-content-between align-items-center">
                      <h6 className="fw-bold text-primary m-0"><i className="bi bi-clipboard-data me-2"></i>Detalle de la Orden</h6>
                      <small className="text-muted fw-bold">{new Date(viewingTask.fechaCreacion).toLocaleDateString()}</small>
                  </div>

                  {/* CONTENIDO SCROLLABLE */}
                  <div className="p-4 flex-grow-1 overflow-auto">
                      
                      {/* ALERTA RECHAZO */}
                      {viewingTask.historial && viewingTask.historial.length > 0 && 
                       viewingTask.historial[viewingTask.historial.length - 1].accion.includes('Rechazado') && (
                         <div className="alert alert-danger py-2 mb-3 shadow-sm d-flex align-items-center">
                            <i className="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
                            <div>
                                <strong className="d-block">Trabajo Rechazado</strong>
                                <small>{viewingTask.historial[viewingTask.historial.length - 1].nota}</small>
                            </div>
                         </div>
                      )}

                      {/* LISTA DE ÍTEMS */}
                      {viewingTask.casos && viewingTask.casos.length > 0 ? (
                          viewingTask.casos.map((caso, index) => (
                            <div key={index} className="mb-4">
                                
                                {/* 1. NOMBRE DEL SERVICIO (DESTACADO) */}
                                <div className="d-flex align-items-center mb-2">
                                    <span className="badge bg-primary me-2">#{index + 1}</span>
                                    {/* 👇 AQUÍ MOSTRAMOS EL SERVICIO REAL O EL FALLBACK */}
                                    <h4 className="fw-bold text-dark m-0">
                                        {caso.tipo_servicio && caso.tipo_servicio !== 'null' ? caso.tipo_servicio : 'Servicio General'}
                                    </h4>
                                </div>

                                <div className="row g-3">
                                    {/* 2. DESCRIPCIÓN */}
                                    <div className="col-md-7">
                                        <div className="p-3 bg-light rounded border border-light h-100">
                                            <label className="text-muted fw-bold small text-uppercase mb-1">Instrucciones:</label>
                                            <p className="mb-0 text-dark" style={{whiteSpace: 'pre-wrap', lineHeight: '1.4'}}>
                                                {caso.descripcion}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3. IMÁGENES (LADO A LADO SI ES POSIBLE) */}
                                    <div className="col-md-5">
                                        <div className="p-3 border rounded h-100">
                                            <label className="text-muted fw-bold small text-uppercase mb-2 d-block">Referencias:</label>
                                            
                                            {caso.imagenes && caso.imagenes.length > 0 ? (
                                                <div className="d-flex flex-wrap gap-2">
                                                    {caso.imagenes.map((img, i) => (
                                                        <div key={i} className="position-relative border rounded overflow-hidden bg-light d-flex align-items-center justify-content-center" style={{width: '80px', height: '80px'}}>
                                                            <img 
                                                                src={img.startsWith('http') ? img : `https://sistema-pendientes.onrender.com/pendientes/uploads/${img}`} 
                                                                alt="Ref"
                                                                style={{width: '100%', height: '100%', objectFit: 'cover'}} 
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none'; 
                                                                    e.currentTarget.nextElementSibling?.classList.remove('d-none');
                                                                }} 
                                                            />
                                                            <div className="text-center text-muted d-none position-absolute p-1">
                                                                <i className="bi bi-image-fill"></i>
                                                            </div>
                                                            <a href={img.startsWith('http') ? img : `https://sistema-pendientes.onrender.com/pendientes/uploads/${img}`} target="_blank" rel="noreferrer" className="stretched-link"></a>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <small className="text-muted fst-italic">Sin archivos adjuntos.</small>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                          ))
                      ) : (
                          <div className="text-center text-muted py-5">
                              <i className="bi bi-inbox fs-1 opacity-25"></i>
                              <p className="mt-2">No se encontraron detalles técnicos.</p>
                          </div>
                      )}
                  </div>
                </Col>

                {/* 👉 COLUMNA DERECHA: PANEL DE CONTROL */}
                <Col lg={4} className="bg-white border-start d-flex flex-column" style={{height: '70vh'}}>
                  
                  {/* HISTORIAL */}
                  <div className="p-3 bg-light border-bottom">
                      <h6 className="fw-bold text-secondary small text-uppercase m-0">Línea de Tiempo</h6>
                  </div>
                  {/* 👇 NUEVO CHAT DE BITÁCORA 👇 */}
                  <div className="p-2 border-bottom bg-white">
                      <div className="input-group input-group-sm">
                          <Form.Control 
                              placeholder="Escribe una nota rápida..." 
                              value={nuevaNota}
                              onChange={(e) => setNuevaNota(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleEnviarNota(); }}
                          />
                          <Button 
                            variant="primary" 
                            disabled={!nuevaNota.trim() || enviandoNota}
                            onClick={handleEnviarNota}
                          >
                              {enviandoNota ? <Spinner size="sm" animation="border"/> : <i className="bi bi-send-fill"></i>}
                          </Button>
                      </div>
                  </div>
                  {/* 👆 FIN DEL CHAT 👆 */}
                  <div className="p-3 flex-grow-1 overflow-auto bg-light">
                      <div className="timeline ps-2">
                          {viewingTask.historial && viewingTask.historial.slice().reverse().map((h, i) => (
                              <div key={i} className="d-flex gap-3 mb-3 position-relative">
                                  {/* Línea vertical */}
                                  <div className="position-absolute top-0 start-0 h-100 border-start border-2 opacity-25" style={{left: '11px', zIndex: 0}}></div>
                                  
                                  <div className="position-relative z-1">
                                      <div className={`rounded-circle border border-2 border-white shadow-sm d-flex align-items-center justify-content-center text-white ${
                                          h.accion === 'Creación' ? 'bg-primary' : 
                                          h.accion.includes('Aprobado') ? 'bg-success' : 
                                          h.accion.includes('Rechazado') ? 'bg-danger' : 'bg-secondary'
                                      }`} style={{width: 24, height: 24, fontSize: '0.6rem'}}>
                                          <i className={`bi ${h.accion === 'Creación' ? 'bi-star-fill' : 'bi-circle-fill'}`}></i>
                                      </div>
                                  </div>
                                  <div className="pb-2">
                                      <div className="fw-bold text-dark small lh-1">{h.accion || 'Acción'}</div>
                                      <div className="text-muted small" style={{fontSize: '0.7rem'}}>
                                          {new Date(h.fecha).toLocaleDateString()} • {new Date(h.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </div>
                                      <div className="text-secondary small fst-italic mt-1">Por: {h.autor}</div>
                                      {h.nota && <div className="bg-white p-2 rounded border mt-1 small text-dark shadow-sm">{h.nota}</div>}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* ZONA DE ACCIÓN (PIE) */}
                  <div className="p-3 bg-white border-top shadow-lg z-3">
                      {/* Selector de Transferencia (BLOQUE CORREGIDO) */}
                      {viewingTask.status !== 'Concluido' && (
                          <div className="input-group input-group-sm mb-3">
                              <span className="input-group-text bg-light fw-bold text-muted">Transferir a:</span>
                              
                              <Form.Select 
                                  className="fw-bold text-dark" 
                                  style={{fontSize: '0.85rem'}}
                                  value={transferDestino}
                                  onChange={(e) => setTransferDestino(e.target.value)}
                              >
                                  <option value="">-- Seleccionar Persona --</option>
                                  {/* Mapeamos los usuarios REALES */}
                                  {allUsers && allUsers
                                    .filter(u => u.rol !== 'Cliente')
                                    .map(u => (
                                      <option key={u.id} value={u.id}>
                                        {u.username} ({u.rol})
                                      </option>
                                  ))}
                              </Form.Select>
                              
                              <Button variant="outline-primary" onClick={handleTransferir}>
                                  <i className="bi bi-arrow-right"></i> Mover
                              </Button>
                          </div>
                      )}

                      {/* Botones Principales (Tamaño Normal) */}
                      <div className="d-grid gap-2">
                          {viewingTask.status !== 'En Revisión' && viewingTask.status !== 'Concluido' && (
                              <Button variant="success" className="fw-bold shadow-sm" onClick={() => handleEnviarARevision && handleEnviarARevision(viewingTask)}>
                                <i className="bi bi-send-check me-2"></i> SOLICITAR REVISIÓN
                              </Button>
                          )}
                          
                          {viewingTask.status === 'En Revisión' && (user?.rol === 'Administrador' || user?.rol === 'Coordinador') && (
                              <div className="d-flex gap-2">
                                  <Button variant="outline-danger" className="w-50 fw-bold" onClick={() => handleDevolver && handleDevolver(viewingTask)}>RECHAZAR</Button>
                                  <Button variant="primary" className="w-50 fw-bold" onClick={() => handleAprobar && handleAprobar(viewingTask)}>APROBAR</Button>
                              </div>
                          )}
                          
                          <Button variant="secondary" size="sm" onClick={() => setViewingTask(null)}>Cerrar</Button>
                      </div>
                  </div>

                </Col>
              </Row>
            </Modal.Body>
          </>
        )}
      </Modal>

    </div>
  );
}

export default Dashboard;