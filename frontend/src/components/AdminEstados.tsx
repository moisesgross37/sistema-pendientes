// frontend/src/components/AdminEstados.tsx
// Esta es la nueva página para gestionar los estados de los casos

import { useState, useEffect } from 'react';
import {
  Container,
  Button,
  Table,
  Modal,
  Form,
  Alert,
  Card,
  Row,
  Col,
  Spinner,
} from 'react-bootstrap';

// --- Constante de la URL de la API (para desarrollo local) ---
const API_URL = import.meta.env.VITE_API_URL;

// Interfaz para el objeto EstadoCaso (la copiamos de Dashboard.tsx)
interface EstadoCaso {
  id: number;
  nombre: string;
  color: string;
  requiereComentario: boolean;
}

interface AdminEstadosProps {
  token: string;
  setView: (view: 'login' | 'dashboard' | 'admin' | 'admin-estados') => void;
}

function AdminEstados({ token, setView }: AdminEstadosProps) {
  const [estados, setEstados] = useState<EstadoCaso[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newColor, setNewColor] = useState('#888888'); // Default al gris
  const [newRequiereComentario, setNewRequiereComentario] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Para el spinner
  const [deletingEstado, setDeletingEstado] = useState<EstadoCaso | null>(null);
  const [editNombre, setEditNombre] = useState('');
const [editColor, setEditColor] = useState('#000000');
const [editRequiereComentario, setEditRequiereComentario] = useState(false);
  const [editingEstado, setEditingEstado] = useState<EstadoCaso | null>(null);

  // (Aquí añadiremos los estados para el modal de 'crear' y 'editar')

  // Cargar los estados al iniciar
  useEffect(() => {
    fetchEstados();
  }, [token]);
useEffect(() => {
  if (editingEstado) {
    // Si hay un estado seleccionado (o sea, no es 'null')...
    // ...copiamos sus valores a los estados del formulario.
    setEditNombre(editingEstado.nombre);
    setEditColor(editingEstado.color);
    setEditRequiereComentario(editingEstado.requiereComentario);
  } else {
    // Si se cierra el modal (editingEstado es 'null'), 
    // reseteamos los estados del formulario.
    setEditNombre('');
    setEditColor('#888888');
    setEditRequiereComentario(false);
  }
}, [editingEstado]);
  const fetchEstados = async () => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/estados-casos`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-store', // <--- AÑADIDO
        },
        cache: 'no-store', // <--- AÑADIDO
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudieron cargar los estados.');
      }
      const data = await res.json();
      setEstados(data);
    } catch (err: any) {
      setError(err.message);
    }
  };
// --- 👇 AÑADE ESTA NUEVA FUNCIÓN AQUÍ ---

/**
 * Esta función se llama al enviar el formulario "Crear Nuevo Estado"
 */
const handleCreateEstado = async (e: React.FormEvent) => {
  e.preventDefault(); // Previene que la página se recargue
  setError('');
  setSuccess('');

  // Validación simple
  if (newNombre.trim() === '') {
    setError('El nombre del estado no puede estar vacío.');
    return;
  }

  setIsLoading(true); // Activa el spinner

  try {
    const body = {
      nombre: newNombre,
      color: newColor,
      requiereComentario: newRequiereComentario,
    };

    const res = await fetch(`${API_URL}/estados-casos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json();
      // (Usamos 'errData.message' porque así lo configuramos en el backend)
      throw new Error(errData.message || 'No se pudo crear el estado.');
    }

    // Si todo salió bien:
    setSuccess(`¡Estado "${newNombre}" creado con éxito!`);
    setNewNombre(''); // Resetea el formulario
    setNewColor('#888888');
    setNewRequiereComentario(false);
    fetchEstados(); // Recarga la lista de estados en la tabla

  } catch (err: any) {
    setError(err.message);

  } finally {
    setIsLoading(false); // Desactiva el spinner
  }
};
// --- 👇 AÑADE ESTA NUEVA FUNCIÓN AQUÍ ---

/**
 * Esta función se llama desde el modal de confirmación de borrado
 */
const handleDeleteEstado = async () => {
  // 1. Asegurarnos de que hay un estado seleccionado para borrar
  if (!deletingEstado) return;

  const id = deletingEstado.id;
  const nombre = deletingEstado.nombre;

  setError('');
  setSuccess('');
  setIsLoading(true);

  try {
    // 2. Llamar a la API de 'estados-casos' (DELETE)
    const res = await fetch(`${API_URL}/estados-casos/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json();
      // (Esto atrapará el error 409 si el estado está en uso)
      throw new Error(errData.message || 'No se pudo eliminar el estado.');
    }

    // 3. Si todo salió bien:
    setSuccess(`¡Estado "${nombre}" eliminado con éxito!`);
    fetchEstados(); // Recarga la lista de estados

  } catch (err: any) {
    setError(err.message);

  } finally {
    // 4. Pase lo que pase (éxito o error), cerramos el modal
    setDeletingEstado(null);
    setIsLoading(false);
  }
};
// --- 👇 AÑADE ESTA NUEVA FUNCIÓN AQUÍ ---

/**
 * Esta función se llama al enviar el formulario del MODAL DE EDICIÓN
 */
const handleUpdateEstado = async (e: React.FormEvent) => {
  e.preventDefault(); // Previene que la página se recargue

  // 1. Seguridad: Asegurarnos de que hay un estado seleccionado
  if (!editingEstado) {
    setError('No hay ningún estado seleccionado para editar.');
    return;
  }

  // 2. Validación de campos (igual que en 'create')
  if (editNombre.trim() === '') {
    setError('El nombre del estado no puede estar vacío.');
    return;
  }

  setError('');
  setSuccess('');
  setIsLoading(true); // Activa el spinner

  const id = editingEstado.id; // Obtenemos el ID del estado que editamos

  // 3. Preparamos el 'body' con los datos de los estados 'edit'
  const body = {
    nombre: editNombre,
    color: editColor,
    requiereComentario: editRequiereComentario,
  };

  try {
    // 4. Llamar a la API de 'estados-casos' (PATCH)
    const res = await fetch(`${API_URL}/estados-casos/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json();
      // (Atrapamos el error de 'nombre duplicado' que viene del backend)
      throw new Error(errData.message || 'No se pudo actualizar el estado.');
    }

    // 5. Si todo salió bien:
    setSuccess(`¡Estado "${editNombre}" actualizado con éxito!`);
    setEditingEstado(null); // Cierra el modal de edición
    fetchEstados(); // Recarga la lista de estados en la tabla

  } catch (err: any) {
    setError(err.message);

  } finally {
    setIsLoading(false); // Desactiva el spinner
  }
};
// --- 👆 ---
// --- 👆 ---
// --- 👆 ---
  // (Aquí añadiremos las funciones handleCreate, handleUpdate, handleDelete)

  return (
    <Container>
      <Button
        variant="outline-secondary"
        onClick={() => setView('admin')} // Botón para volver a Admin de Usuarios
        className="mb-4"
      >
        &larr; Volver a Gestión de Usuarios
      </Button>

      <h2>Gestión de Estados de Casos</h2>
      <p>
        Aquí puedes crear, editar y eliminar los estados que los
        colaboradores pueden asignar a los casos (sub-tareas).
      </p>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* --- 👇 REEMPLAZA ESTE BLOQUE COMPLETO --- */}
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Crear Nuevo Estado</Card.Title>

          {/* 1. Conectamos la función de envío */}
          <Form onSubmit={handleCreateEstado}>
            <Row>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Nombre del Estado</Form.Label>
                  {/* 2. Conectamos el estado 'newNombre' */}
                  <Form.Control
                    type="text"
                    placeholder="Ej: En Espera, Detenido"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Color</Form.Label>
                  {/* 3. Conectamos el estado 'newColor' */}
                  <Form.Control
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={3} className="d-flex align-items-end">
                <Form.Group>
                  {/* 4. Conectamos el estado 'newRequiereComentario' */}
                  <Form.Check
                    type="checkbox"
                    label="¿Requiere comentario?"
                    checked={newRequiereComentario}
                    onChange={(e) => setNewRequiereComentario(e.target.checked)}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={2} className="d-flex align-items-end">
                {/* 5. Conectamos el 'isLoading' al botón */}
                <Button
                  variant="success"
                  type="submit"
                  className="w-100"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    'Crear'
                  )}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
      {/* --- 👆 --- */}

      <h4>Estados Actuales</h4>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Color</th>
            <th>¿Requiere Comentario?</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {estados.map((estado) => (
            <tr key={estado.id}>
              <td>{estado.id}</td>
              <td>{estado.nombre}</td>
              <td>
                <div
                  style={{
                    backgroundColor: estado.color,
                    width: '100%',
                    height: '25px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                  title={estado.color}
                ></div>
              </td>
              <td>{estado.requiereComentario ? 'Sí' : 'No'}</td>
              <td>
                {/* --- 👇 CAMBIO AQUÍ --- */}
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="me-2"
                  // 1. Conectamos el onClick para que guarde el estado
                  onClick={() => setEditingEstado(estado)}
                >
                  Editar
                </Button>
                {/* --- 👆 --- */}

                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => setDeletingEstado(estado)}
                >
                  Eliminar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      {/* --- 👇 AÑADE ESTE NUEVO MODAL AQUÍ --- */}

<Modal 
  show={deletingEstado !== null} 
  onHide={() => setDeletingEstado(null)} 
  centered
>
  <Modal.Header closeButton>
    <Modal.Title>Confirmar Eliminación</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Alert variant="danger">
      <p>¿Estás seguro de que quieres eliminar este estado?</p>
      <hr />
      <p className="mb-0">
        <strong>ID #{deletingEstado?.id}: {deletingEstado?.nombre}</strong>
      </p>
    </Alert>
    <p className="text-muted">
      No podrás eliminar un estado si está siendo utilizado por algún caso.
    </p>
  </Modal.Body>
  <Modal.Footer>
    <Button 
      variant="secondary" 
      onClick={() => setDeletingEstado(null)} 
      disabled={isLoading}
    >
      Cancelar
    </Button>
    <Button 
      variant="danger" 
      onClick={handleDeleteEstado} // 2. Llama a nuestra función de borrado
      disabled={isLoading}
    >
      {isLoading ? 'Eliminando...' : 'Confirmar Eliminación'}
    </Button>
  </Modal.Footer>
</Modal>
{/* --- 👇 AÑADE ESTE NUEVO MODAL AQUÍ --- */}

{/* ================================================================ */}
{/* ===== 🚀 NUEVO MODAL DE EDICIÓN DE ESTADO 🚀 ===== */}
{/* ================================================================ */}
<Modal 
  show={editingEstado !== null} 
  onHide={() => setEditingEstado(null)} 
  centered 
  size="lg"
>
  <Form onSubmit={handleUpdateEstado}>
    <Modal.Header closeButton>
      <Modal.Title>
        Editar Estado: {editingEstado?.nombre} (ID: #{editingEstado?.id})
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {/* Mostramos errores DENTRO del modal si la validación falla */}
      {error && <Alert variant="danger">{error}</Alert>}

      <Row>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Nombre del Estado</Form.Label>
            {/* 1. Conectado a 'editNombre' */}
            <Form.Control
              type="text"
              placeholder="Ej: En Espera, Detenido"
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              disabled={isLoading}
            />
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>Color</Form.Label>
            {/* 2. Conectado a 'editColor' */}
            <Form.Control
              type="color"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
              disabled={isLoading}
            />
          </Form.Group>
        </Col>
        <Col md={4} className="d-flex align-items-center pt-3">
          <Form.Group>
            {/* 3. Conectado a 'editRequiereComentario' */}
            <Form.Check
              type="checkbox"
              label="¿Requiere comentario?"
              checked={editRequiereComentario}
              onChange={(e) => setEditRequiereComentario(e.target.checked)}
              disabled={isLoading}
            />
          </Form.Group>
        </Col>
      </Row>
    </Modal.Body>
    <Modal.Footer>
      <Button 
        variant="secondary" 
        onClick={() => setEditingEstado(null)} 
        disabled={isLoading}
      >
        Cancelar
      </Button>
      <Button 
        variant="success" 
        type="submit" // Llama a 'handleUpdateEstado'
        disabled={isLoading}
      >
        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
      </Button>
    </Modal.Footer>
  </Form>
</Modal>

{/* --- 👆 --- */}
{/* --- 👆 --- */}
    </Container>
  );
}

export default AdminEstados;