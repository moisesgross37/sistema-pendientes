// frontend/src/components/AdminPage.tsx
// BLOQUE 1: Configuración, Estados y Carga Inicial

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

// --- Constantes ---
const DEPARTAMENTOS_DISPONIBLES = [
  'Artes', 
  'Impresion', 
  'Colector',       // 👈 Antes era 'Logistica' (Solución al problema de tildes)
  'Retoque', 
  'Marketing', 
  'Ventas',
  'Inventario',     // 🆕 Nuevo
  'Administracion', // 🆕 Nuevo
  'Coordinacion'    // 🆕 Nuevo
];

const API_URL = import.meta.env.VITE_API_URL;
// --- Interfaces ---
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
  departamentos?: string[]; // 👈 AGREGADO: Para que TypeScript reconozca las insignias
}

function AdminPage({ token, setView }: AdminPageProps) {
  // 1. Estados Generales
  const [users, setUsers] = useState<Usuario[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 2. Estados para "Crear Usuario"
  const [newNombreCompleto, setNewNombreCompleto] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRol, setNewRol] = useState('Asesor');
  
  // 3. Estados para Departamentos (Insignias)
  const [selectedDeptos, setSelectedDeptos] = useState<string[]>([]);

  // 4. Estados para Modales (Borrar, Resetear Clave, Editar Rol)
  const [deletingUsuario, setDeletingUsuario] = useState<Usuario | null>(null);
  
  const [resettingUsuario, setResettingUsuario] = useState<Usuario | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  
  const [editingRolUsuario, setEditingRolUsuario] = useState<Usuario | null>(null);
  const [selectedRolUpdate, setSelectedRolUpdate] = useState('');

  // --- Helper para marcar/desmarcar casillas de departamentos ---
  const toggleDepto = (depto: string) => {
    if (selectedDeptos.includes(depto)) {
      setSelectedDeptos(selectedDeptos.filter(d => d !== depto));
    } else {
      setSelectedDeptos([...selectedDeptos, depto]);
    }
  };

  // --- Carga Inicial ---
  useEffect(() => {
    fetchUsers();
  }, [token]);

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
// frontend/src/components/AdminPage.tsx
// BLOQUE 2: Manejadores de Eventos (Guardar, Crear, Resetear, Borrar)

  /// --- FUNCIÓN MEJORADA: GUARDAR ROL E INSIGNIAS ---
  const handleSaveNewRol = async () => {
    if (!editingRolUsuario) return;

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // 👇 CAMBIO IMPORTANTE: Usamos la ruta general (PATCH /usuarios/:id)
      // Esta ruta ya está preparada en el backend para recibir 'rol' y 'departamentos'
      const res = await fetch(`${API_URL}/usuarios/${editingRolUsuario.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            rol: selectedRolUpdate,
            departamentos: selectedDeptos // 👈 ¡Ahora sí enviamos las insignias!
        }), 
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo actualizar el usuario.');
      }

      setSuccess(`Usuario "${editingRolUsuario.username}" actualizado correctamente.`);
      fetchUsers(); // Recargamos la tabla para ver los cambios
      
      setEditingRolUsuario(null);
      setSelectedRolUpdate('');
      setSelectedDeptos([]);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 👇 CREAR USUARIO (AQUÍ AGREGAMOS LOS DEPARTAMENTOS) ---
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
          departamentos: selectedDeptos, // 👈 ¡AGREGADO! Enviamos las insignias
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo crear el usuario.');
      }

      setSuccess(`¡Usuario "${newUsername}" creado con éxito!`);
      // Limpiamos el formulario
      setNewNombreCompleto('');
      setNewUsername('');
      setNewPassword('');
      setNewRol('Asesor');
      setSelectedDeptos([]); // 👈 ¡AGREGADO! Limpiamos los checkboxes
      
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
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
  
  // --- LÓGICA DE RESETEAR CLAVE ---
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
// --- JSX (HTML) COMPLETO Y DEFINITIVO ---
  return (
    <Container className="py-4">
      
      {/* 1. HEADER DE NAVEGACIÓN */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button variant="outline-secondary" onClick={() => setView('dashboard')}>
          &larr; Volver al Dashboard
        </Button>
        <Button variant="success" onClick={() => setView('admin-estados')}>
          Gestionar Estados de Casos &rarr;
        </Button>
      </div>

      <h2 className="mb-3 fw-bold text-dark">Gestión de Usuarios</h2>
      
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {/* 2. FORMULARIO DE CREACIÓN (CON CHECKBOXES NUEVOS) */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-primary text-white fw-bold">Añadir Nuevo Usuario</Card.Header>
        <Card.Body>
          <Form onSubmit={handleCreateUser}>
            <Row className="g-3">
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
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Contraseña</Form.Label>
                  <Form.Control 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Rol</Form.Label>
                  <Form.Select
                    value={newRol}
                    onChange={(e) => setNewRol(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="Asesor">Asesor</option>
                    <option value="Colaborador">Colaborador</option>
                    <option value="Coordinador">Coordinador</option>
                    <option value="Administrador">Administrador</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* 👇 NUEVO: SECCIÓN DE DEPARTAMENTOS AL CREAR 👇 */}
            <Row className="mt-3">
              <Col md={12}>
                <Form.Label className="fw-bold text-muted small">Insignias / Departamentos Técnicos</Form.Label>
                <div className="d-flex flex-wrap gap-2 p-2 border rounded bg-light">
                  {DEPARTAMENTOS_DISPONIBLES.map((depto) => (
                    <Form.Check
                      key={depto}
                      type="checkbox"
                      id={`create-check-${depto}`}
                      label={depto}
                      checked={selectedDeptos.includes(depto)}
                      onChange={() => toggleDepto(depto)}
                      className="me-2"
                    />
                  ))}
                </div>
              </Col>
            </Row>

            <Row className="mt-3">
              <Col className="d-flex justify-content-end">
                <Button variant="primary" type="submit" disabled={isLoading} className="px-4">
                  {isLoading ? <Spinner animation="border" size="sm" /> : '+ Crear Usuario'}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* 3. TABLA DE USUARIOS (CON COLUMNA INSIGNIAS) */}
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table striped hover responsive className="mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Insignias / Deptos</th> {/* Nueva Columna */}
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="fw-medium">{user.nombreCompleto}</td>
                  <td>{user.username}</td>
                  <td><Badge bg="info" className="text-dark">{user.rol}</Badge></td>
                  <td>
                    {/* Renderizamos las insignias */}
                    {user.departamentos && user.departamentos.length > 0 ? (
                      <div className="d-flex gap-1 flex-wrap">
                        {user.departamentos.map((d, i) => (
                          <Badge key={i} bg="secondary" style={{fontSize: '0.65rem'}}>{d}</Badge>
                        ))}
                      </div>
                    ) : <span className="text-muted small">-</span>}
                  </td>
                  <td>
                    <Badge bg={user.isActive ? 'success' : 'secondary'}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td>
                    <div className="d-flex gap-1">
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        onClick={() => {
                           setEditingRolUsuario(user);
                           setSelectedRolUpdate(user.rol);
                           setSelectedDeptos(user.departamentos || []); // 👈 Cargamos sus deptos actuales
                        }}
                        title="Editar Rol e Insignias"
                      >
                        <i className="bi bi-pencil"></i>
                      </Button>
                      
                      <Button 
                        variant="outline-warning" 
                        size="sm" 
                        onClick={() => handleUpdateEstado(user.id, user.isActive)}
                        title={user.isActive ? "Desactivar" : "Activar"}
                      >
                        <i className={`bi ${user.isActive ? 'bi-toggle-on' : 'bi-toggle-off'}`}></i>
                      </Button>

                      <Button 
                        variant="outline-dark" 
                        size="sm" 
                        onClick={() => setResettingUsuario(user)}
                        title="Resetear Clave"
                      >
                        <i className="bi bi-key"></i>
                      </Button>

                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => setDeletingUsuario(user)}
                        title="Eliminar"
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* 4. MODAL DE ELIMINACIÓN */}
      <Modal show={deletingUsuario !== null} onHide={() => setDeletingUsuario(null)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger" className="border-0 bg-danger bg-opacity-10">
            <p>¿Estás seguro de que quieres eliminar este usuario?</p>
            <hr />
            <p className="mb-0 fw-bold text-center fs-5">
              {deletingUsuario?.nombreCompleto} <span className="fw-normal fs-6">({deletingUsuario?.username})</span>
            </p>
          </Alert>
          <p className="text-muted small text-center mb-0">
            Esta acción es irreversible.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeletingUsuario(null)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteUser} disabled={isLoading}>
            {isLoading ? 'Eliminando...' : 'Sí, Eliminar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 5. MODAL DE RESETEAR CLAVE */}
      <Modal 
        show={resettingUsuario !== null} 
        onHide={() => {
          setResettingUsuario(null);
          setNewResetPassword('');
          setError('');
        }} 
        centered
      >
        <Form onSubmit={handleResetPassword}>
          <Modal.Header closeButton>
            <Modal.Title>Resetear Clave: {resettingUsuario?.username}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group>
              <Form.Label>Nueva Contraseña Temporal</Form.Label>
              <Form.Control
                type="password"
                placeholder="Escribe la nueva clave..."
                value={newResetPassword}
                onChange={(e) => setNewResetPassword(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setResettingUsuario(null)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button variant="warning" type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Confirmar Cambio'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* 6. MODAL DE CAMBIO DE ROL + INSIGNIAS (MEJORADO) */}
      <Modal 
        show={editingRolUsuario !== null} 
        onHide={() => setEditingRolUsuario(null)} 
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Editar Usuario: {editingRolUsuario?.username}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="fw-bold mb-1">Rol Principal</label>
            <Form.Select
              value={selectedRolUpdate}
              onChange={(e) => setSelectedRolUpdate(e.target.value)}
            >
              <option value="Administrador">Administrador</option>
              <option value="Coordinador">Coordinador</option>
              <option value="Colaborador">Colaborador</option>
              <option value="Asesor">Asesor</option>
            </Form.Select>
          </div>

          {/* 👇 AQUÍ INSERTAMOS LOS CHECKBOXES TAMBIÉN EN EL MODAL 👇 */}
          <div className="mb-3">
             <label className="fw-bold mb-1 text-muted small">Insignias / Departamentos</label>
             <div className="d-flex flex-wrap gap-2 p-2 border rounded bg-light">
                {DEPARTAMENTOS_DISPONIBLES.map((depto) => (
                  <Form.Check
                    key={depto}
                    type="checkbox"
                    id={`edit-check-${depto}`}
                    label={depto}
                    checked={selectedDeptos.includes(depto)}
                    onChange={() => toggleDepto(depto)}
                  />
                ))}
             </div>
             <Form.Text className="text-muted small">
               * Nota: Por ahora, al guardar aquí solo se actualiza el ROL. 
               (Requiere actualizar el endpoint del backend para guardar insignias en edición).
             </Form.Text>
          </div>

        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditingRolUsuario(null)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSaveNewRol} disabled={isLoading}>
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
}

export default AdminPage;