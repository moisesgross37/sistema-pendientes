import React, { useState, useEffect } from 'react';
import { Table, Form, Badge, Container, Card, InputGroup, Button, Modal, Spinner, Alert } from 'react-bootstrap';

// URL del Backend
const API_URL = import.meta.env.VITE_API_URL || 'https://sistema-pendientes.onrender.com';

interface Centro {
  id: number;
  nombre: string;
  visible: boolean;
}

export const AdminCentros: React.FC = () => {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para Modales
  const [showModal, setShowModal] = useState(false);
  const [editingCentro, setEditingCentro] = useState<Centro | null>(null);
  const [nombreForm, setNombreForm] = useState('');
  const [saving, setSaving] = useState(false);

  // Cargar lista
  const fetchCentros = async () => {
    setLoading(true);
    try {
      // Usamos el endpoint que trae TODOS (incluso los ocultos)
      const res = await fetch(`${API_URL}/marketing/admin/lista-centros`);
      if (res.ok) setCentros(await res.json());
    } catch (error) {
      console.error("Error cargando centros", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentros();
  }, []);

  // --- ACCIONES CRUD ---

  // 1. ABRIR MODAL (CREAR O EDITAR)
  const handleOpenModal = (centro?: Centro) => {
    if (centro) {
        setEditingCentro(centro);
        setNombreForm(centro.nombre);
    } else {
        setEditingCentro(null);
        setNombreForm('');
    }
    setShowModal(true);
  };

  // 2. GUARDAR (CREAR O ACTUALIZAR)
  const handleSave = async () => {
    if (!nombreForm.trim()) return alert("El nombre es obligatorio");
    setSaving(true);

    try {
        let url = `${API_URL}/marketing/admin/centro`;
        let method = 'POST';
        
        // Si estamos editando, cambiamos a PATCH y agregamos ID
        if (editingCentro) {
            url = `${API_URL}/marketing/admin/centro/${editingCentro.id}`;
            method = 'PATCH';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombreForm })
        });

        if (res.ok) {
            setShowModal(false);
            fetchCentros(); // Recargar lista
        } else {
            alert("Error al guardar. Verifica que el nombre no esté repetido.");
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión");
    } finally {
        setSaving(false);
    }
  };

  // 3. ELIMINAR (SOLO PARA LIMPIEZA)
  const handleDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`⚠️ PELIGRO ⚠️\n\n¿Estás seguro de borrar "${nombre}"?\n\nSi borras este centro, podrías romper los pendientes históricos asociados a él.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/marketing/admin/centro/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchCentros();
        } else {
            alert("No se pudo eliminar. Es posible que tenga datos asociados.");
        }
    } catch (error) {
        console.error(error);
    }
  };

  // 4. FILTRAR
  const filteredCentros = centros.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container className="mt-4">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
            <div>
                <h5 className="m-0 fw-bold text-dark">🏢 Gestión Maestra de Centros</h5>
                <small className="text-muted">Diccionario oficial para Coordinación</small>
            </div>
            <Button variant="primary" onClick={() => handleOpenModal()}>
                ➕ Crear Nuevo Centro
            </Button>
        </Card.Header>
        
        <Card.Body>
          {/* BUSCADOR */}
          <InputGroup className="mb-3">
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Buscar centro..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          {/* TABLA */}
          <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            <Table hover responsive className="align-middle">
              <thead className="bg-light sticky-top">
                <tr>
                  <th>Nombre Oficial</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCentros.map(centro => (
                  <tr key={centro.id}>
                    <td className="fw-500 fs-5">{centro.nombre}</td>
                    <td className="text-center">
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        className="me-2"
                        title="Corregir Nombre"
                        onClick={() => handleOpenModal(centro)}
                      >
                        ✏️ Editar
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        title="Borrar Definitivamente"
                        onClick={() => handleDelete(centro.id, centro.nombre)}
                      >
                        🗑️
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* MODAL PARA CREAR / EDITAR */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
            <Modal.Title>{editingCentro ? '✏️ Corregir Nombre' : '➕ Registrar Nuevo Centro'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <Form>
                <Form.Group>
                    <Form.Label>Nombre del Centro Educativo</Form.Label>
                    <Form.Control 
                        autoFocus
                        type="text" 
                        placeholder="Ej: Colegio San Pedro Apóstol" 
                        value={nombreForm}
                        onChange={e => setNombreForm(e.target.value)}
                    />
                    <Form.Text className="text-muted">
                        Escribe el nombre completo y correcto (Mayúsculas, acentos).
                    </Form.Text>
                </Form.Group>
            </Form>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Centro'}
            </Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
};