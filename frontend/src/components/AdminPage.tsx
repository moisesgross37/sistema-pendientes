// frontend/src/components/AdminPage.tsx
// ARCHIVO COMPLETO Y CORREGIDO
// (Incluye el modal 'Eliminar' y la lógica para 'Resetear Clave')

import { useState, useEffect } from 'react';
import type { AppView } from '../App';
import {
  Container,
  Button,
  Table,
  Form,
  Alert,
  Card,
  Row,
  Col,
  Spinner,
  Badge,
  Modal,
} from 'react-bootstrap';

// --- Constante de la URL de la API (para desarrollo local) ---
const API_URL = import.meta.env.VITE_API_URL;

// --- Interfaces (sin cambios) ---
interface AdminPageProps {
  token: string;
  setView: (view: AppView) => void;
}

interface Usuario {
  id: number;
  username: string;
  nombreCompleto: string;
  rol: string;
  isActive: boolean;
}

function AdminPage({ token, setView }: AdminPageProps) {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Estados para el formulario de "Añadir Nuevo"
  const [newNombreCompleto, setNewNombreCompleto] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRol, setNewRol] = useState('Asesor');

  // Estado para el modal de borrado
  const [deletingUsuario, setDeletingUsuario] = useState<Usuario | null>(null);

  // --- 👇 1. ESTADOS PARA RESETEAR CLAVE (Paso 28.1) ---
  const [resettingUsuario, setResettingUsuario] = useState<Usuario | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  // --- 👆 ---

  // Cargar usuarios al iniciar
  useEffect(() => {
    fetchUsers();
  }, [token]);

  // --- (fetchUsers, handleCreateUser... sin cambios) ---
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(
          'No se pudo cargar la lista de usuarios. ¿Estás seguro de que eres Administrador?',
        );
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newNombreCompleto || !newUsername || !newPassword) {
      setError('Todos los campos son obligatorios.');
      return;
    }
    
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombreCompleto: newNombreCompleto,
          username: newUsername,
          password: newPassword,
          rol: newRol,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo crear el usuario.');
      }

      setSuccess(`¡Usuario "${newUsername}" creado con éxito!`);
      setNewNombreCompleto('');
      setNewUsername('');
      setNewPassword('');
      setNewRol('Asesor');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- (handleUpdateRol, handleUpdateEstado... sin cambios) ---
  const handleUpdateRol = async (id: number, rol: string) => {
    const nuevoRol = rol === 'Administrador' ? 'Colaborador' : 'Administrador';
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch(`${API_URL}/usuarios/${id}/rol`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rol: nuevoRol }),
      });
       if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo actualizar el rol.');
      }
      setSuccess('Rol actualizado con éxito.');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateEstado = async (id: number, isActive: boolean) => {
    const nuevoEstado = !isActive;
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch(`${API_URL}/usuarios/${id}/estado`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: nuevoEstado }),
      });
       if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo actualizar el estado.');
      }
      setSuccess('Estado actualizado con éxito.');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  // --- 👇 2. LÓGICA DE RESETEAR CLAVE ACTUALIZADA (Paso 28.3) ---
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); 

    if (!resettingUsuario) return;

    if (!newResetPassword || newResetPassword.trim() === '') {
      setError('La nueva contraseña no puede estar vacía.');
      return; 
    }

    const id = resettingUsuario.id; 

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/usuarios/${id}/password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newResetPassword }), 
      });
       if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo resetear la contraseña.');
      }
      
      setSuccess(`Contraseña para "${resettingUsuario.username}" actualizada con éxito.`);
      
      setResettingUsuario(null);
      setNewResetPassword('');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  // --- 👆 ---

  // --- (handleDeleteUser... sin cambios, ya está bien) ---
  const handleDeleteUser = async () => {
    if (!deletingUsuario) return;
    const id = deletingUsuario.id;

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/usuarios/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo eliminar el usuario.');
      }

      setSuccess(`Usuario "${deletingUsuario.username}" eliminado con éxito.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingUsuario(null);
      setIsLoading(false);
    }
  };

  // --- JSX (HTML) del componente ---
  return (
    <Container>
      {/* (Botones de navegación) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1em',
        }}
      >
        <button onClick={() => setView('dashboard')}>
          &larr; Volver al Dashboard
        </button>
        <button
          onClick={() => setView('admin-estados')}
          style={{
            padding: '6px 12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Gestionar Estados de Casos &rarr;
        </button>
      </div>

      <h2>Gestión de Usuarios</h2>
      
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {/* (Formulario de Creación) */}
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Añadir Nuevo Usuario</Card.Title>
          <Form onSubmit={handleCreateUser}>
            <Row>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Nombre Completo</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Ej: Juan Perez" 
                    value={newNombreCompleto}
                    onChange={(e) => setNewNombreCompleto(e.target.value)}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Nombre de Usuario</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Ej: jperez" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Contraseña Temporal</Form.Label>
                  <Form.Control 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group>
                  <Form.Label>Rol</Form.Label>
                  <Form.Select
                    value={newRol}
                    onChange={(e) => setNewRol(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="Asesor">Asesor</option>
                    <option value="Colaborador">Colaborador</option>
                    <option value="Administrador">Administrador</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                <Button variant="success" type="submit" className="w-100" disabled={isLoading}>
                  {isLoading ? <Spinner animation="border" size="sm" /> : 'Crear Usuario'}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* --- 👇 PEGA ESTE BLOQUE COMPLETO DESDE AQUÍ HASTA EL FINAL --- */}

      <h4>Usuarios Actuales</h4>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Nombre Completo</th>
            <th>Nombre de Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.nombreCompleto}</td>
              <td>{user.username}</td>
              <td>{user.rol}</td>
              <td>
                <Badge bg={user.isActive ? 'success' : 'secondary'}>
                  {user.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </td>
              <td>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  className="me-2"
                  onClick={() => handleUpdateRol(user.id, user.rol)}
                >
                  Editar Rol
                </Button>
                <Button 
                  variant="outline-warning" 
                  size="sm" 
                  className="me-2"
                  onClick={() => handleUpdateEstado(user.id, user.isActive)}
                >
                  {user.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                {/* --- BOTÓN DE RESETEAR CLAVE CONECTADO (Paso 28.2) --- */}
                <Button 
                  variant="outline-secondary" 
                  size="sm" 
                  className="me-2"
                  onClick={() => setResettingUsuario(user)}
                >
                  Resetear Clave
                </Button>
                {/* --- BOTÓN DE BORRADO CONECTADO (Paso 27.2) --- */}
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => setDeletingUsuario(user)}
                >
                  Eliminar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* ================================================================ */}
      {/* ===== 🚀 MODAL DE CONFIRMACIÓN DE BORRADO DE USUARIO 🚀 ===== */}
      {/* ================================================================ */}
      <Modal show={deletingUsuario !== null} onHide={() => setDeletingUsuario(null)} centered size="md">
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <p>¿Estás seguro de que quieres eliminar este usuario?</p>
            <hr />
            <p className="mb-0">
              <strong>{deletingUsuario?.nombreCompleto} ({deletingUsuario?.username})</strong>
            </p>
          </Alert>
          <p className="text-muted">
            Esta acción no se puede deshacer. 
            (No podrás eliminarlo si está asignado a algún proyecto).
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setDeletingUsuario(null)} 
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteUser} 
            disabled={isLoading}
          >
            {isLoading ? 'Eliminando...' : 'Confirmar Eliminación'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ================================================================ */}
      {/* ===== 🚀 NUEVO MODAL DE RESETEAR CLAVE (Paso 28.4) 🚀 ===== */}
      {/* ================================================================ */}
      <Modal 
        show={resettingUsuario !== null} 
        onHide={() => {
          setResettingUsuario(null);
          setNewResetPassword(''); // Resetea la clave al cerrar
          setError(''); // Limpia errores
        }} 
        centered 
        size="md"
      >
        <Form onSubmit={handleResetPassword}>
          <Modal.Header closeButton>
            <Modal.Title>
              Resetear Contraseña para: {resettingUsuario?.username}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            
            {/* Mostramos errores DENTRO del modal */}
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form.Group>
              <Form.Label>Nueva Contraseña</Form.Label>
              <Form.Control
                type="password"
                placeholder="Escribe la nueva clave"
                value={newResetPassword}
                onChange={(e) => setNewResetPassword(e.target.value)}
                disabled={isLoading}
                autoFocus // Pone el cursor aquí automáticamente
              />
            </Form.Group>
            
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => {
                setResettingUsuario(null);
                setNewResetPassword('');
                setError('');
              }} 
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              variant="success" // Usamos verde para "Guardar"
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </Container> // <-- 1. Cierre del Container (Arregla el error 521)
    ); // <-- 2. Cierre del return
} // <-- 3. Cierre de la función AdminPage

export default AdminPage;