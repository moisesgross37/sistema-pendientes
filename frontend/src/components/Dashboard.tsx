import { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { Button, Table, Form, Modal, Card, Alert, Row, Col, Badge, ListGroup } from 'react-bootstrap';

// --- Interfaces ---
interface DashboardProps {
  token: string;
  setView: (view: 'login' | 'dashboard' | 'admin') => void;
}

interface Usuario {
  id: number;
  username: string;
  rol: string;
}

interface Pendiente {
  id: number;
  fechaCreacion: string;
  fechaAsignacion: string | null;
  fechaConclusion: string | null;
  nombreCentro: string;
  descripcion: string;
  status: string;
  asesor: Usuario;
  colaboradorAsignado?: Usuario | null;
  imagenes?: string[];
}

interface DecodedToken {
  sub: number;
  username: string;
  rol: string;
}

// --- Componente ---
function Dashboard({ token, setView }: DashboardProps) {
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNombreCentro, setNewNombreCentro] = useState('');
  const [newDescripcion, setNewDescripcion] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingPendiente, setEditingPendiente] = useState<Pendiente | null>(null);
  const [allUsers, setAllUsers] = useState<Usuario[]>([]);
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [filtroAsesor, setFiltroAsesor] = useState('');
  const [filtroAsignado, setFiltroAsignado] = useState('');
  const [filtroDias, setFiltroDias] = useState('');
  const [viewingImages, setViewingImages] = useState<string[] | null>(null);

  const fetchPendientes = async () => {
    try {
      const response = await fetch('https://sistema-pendientes.onrender.com/pendientes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok)
        throw new Error('No se pudo obtener la lista de pendientes.');
      const data = await response.json();
      setPendientes(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('https://sistema-pendientes.onrender.com/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok)
        throw new Error('No se pudo cargar la lista de usuarios.');
      setAllUsers(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    try {
      const decodedToken: DecodedToken = jwtDecode(token);
      setUserRole(decodedToken.rol);
      fetchPendientes();
      
      // ================================================================
      // ===== 🚀 CORRECCIÓN 1: Cargar usuarios para Admins Y Colaboradores 🚀 =====
      // ================================================================
      if (decodedToken.rol === 'Administrador' || decodedToken.rol === 'Colaborador') {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error decodificando el token:', error);
      setError('El token no es válido.');
    }
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prevFiles => [...prevFiles, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveFile = (fileIndex: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== fileIndex));
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const uploadedFileNames: string[] = [];
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });

        const uploadRes = await fetch('https://sistema-pendientes.onrender.com/pendientes/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error('Falló la subida de uno o más archivos.');
        
        uploadData.forEach((file: any) => uploadedFileNames.push(file.fileName));
      }

      const decodedToken: DecodedToken = jwtDecode(token);
      const asesorId = decodedToken.sub;
      const response = await fetch('https://sistema-pendientes.onrender.com/pendientes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombreCentro: newNombreCentro,
          descripcion: newDescripcion,
          asesorId: asesorId,
          imagenes: uploadedFileNames,
        }),
      });
      if (!response.ok) throw new Error('No se pudo crear el pendiente.');
      
      setNewNombreCentro('');
      setNewDescripcion('');
      setSelectedFiles([]);
      if(fileInputRef.current) fileInputRef.current.value = "";
      setShowCreateForm(false);
      fetchPendientes();

    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenUpdateModal = (pendiente: Pendiente) => {
    setEditingPendiente(pendiente);
    setSelectedStatus(pendiente.status);
    setSelectedColaboradorId(
      pendiente.colaboradorAsignado?.id.toString() || '',
    );
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPendiente) return;
    try {
      const res = await fetch(
        `https://sistema-pendientes.onrender.com/pendientes/${editingPendiente.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: selectedStatus,
            colaboradorAsignadoId: parseInt(selectedColaboradorId) || undefined,
          }),
        },
      );
      if (!res.ok) throw new Error('Falló la actualización.');
      setEditingPendiente(null);
      fetchPendientes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePendiente = async (id: number) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el pendiente #${id}? Esta acción no se puede deshacer.`)) {
      try {
        const res = await fetch(`https://sistema-pendientes.onrender.com/pendientes/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'No se pudo eliminar el pendiente.');
        }
        fetchPendientes();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const filteredPendientes = pendientes.filter(p => {
    if (filtroAsesor && p.asesor.id !== parseInt(filtroAsesor)) return false;
    if (filtroAsignado) {
      if (filtroAsignado === 'ninguno' && p.colaboradorAsignado) return false;
      if (filtroAsignado !== 'ninguno' && p.colaboradorAsignado?.id !== parseInt(filtroAsignado)) return false;
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

  const pendientesActivos = filteredPendientes.filter(p => p.status !== 'Concluido');
  const pendientesConcluidos = filteredPendientes.filter(p => p.status === 'Concluido');

  const performanceData = pendientesActivos
    .filter(p => p.colaboradorAsignado)
    .reduce((acc, p) => {
      const colaborador = p.colaboradorAsignado!;
      if (!acc[colaborador.id]) {
        acc[colaborador.id] = { username: colaborador.username, normal: 0, urgente: 0, critico: 0, total: 0 };
      }
      const fechaCreacion = new Date(p.fechaCreacion);
      const hoy = new Date();
      const diffTiempo = hoy.getTime() - fechaCreacion.getTime();
      const diffDias = Math.ceil(diffTiempo / (1000 * 3600 * 24));
      if (diffDias >= 10) acc[colaborador.id].critico++;
      else if (diffDias >= 5) acc[colaborador.id].urgente++;
