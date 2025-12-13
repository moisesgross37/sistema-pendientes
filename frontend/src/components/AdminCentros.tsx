import React, { useState, useEffect } from 'react';
import { Table, Form, Badge, Container, Card, InputGroup } from 'react-bootstrap';

// URL del Backend (Asegúrate de que coincida con la tuya)
const API_URL = 'https://sistema-pendientes.onrender.com'; // O localhost si estás probando local

interface Centro {
  id: number;
  nombre: string;
  visible: boolean;
}

export const AdminCentros: React.FC = () => {
  const [centros, setCentros] = useState<Centro[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Cargar la lista completa (Visibles y Ocultos)
  const fetchCentros = async () => {
    try {
      setLoading(true);
      // Nota: Usamos la ruta de ADMIN que creamos en el Backend
      const res = await fetch(`${API_URL}/marketing/admin/lista-centros`);
      if (res.ok) {
        const data = await res.json();
        setCentros(data);
      }
    } catch (error) {
      console.error("Error cargando centros", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCentros();
  }, []);

  // 2. Función para Apagar/Prender (El Interruptor) 💡
  const handleToggle = async (id: number) => {
    // Actualización optimista (cambiamos visualmente primero para que se sienta rápido)
    const newCentros = centros.map(c => 
      c.id === id ? { ...c, visible: !c.visible } : c
    );
    setCentros(newCentros);

    try {
      // Enviamos la orden al Backend
      await fetch(`${API_URL}/marketing/admin/centro/${id}/toggle`, { method: 'PATCH' });
    } catch (error) {
      console.error("Error cambiando visibilidad", error);
      // Si falla, revertimos el cambio (opcional)
      fetchCentros();
    }
  };

  // 3. Filtrar por buscador
  const filteredCentros = centros.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container className="mt-4">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-bottom py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="m-0 fw-bold text-dark">🧹 Limpieza de Nombres de Centros</h5>
            <Badge bg="info">{centros.length} Total</Badge>
          </div>
        </Card.Header>
        
        <Card.Body>
          {/* BUSCADOR */}
          <InputGroup className="mb-3">
            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
            <Form.Control
              placeholder="Escribe para encontrar duplicados (Ej: 'San Pedro')..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </InputGroup>

          {/* TABLA DE INTERRUPTORES */}
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <Table hover responsive className="align-middle">
              <thead className="bg-light sticky-top">
                <tr>
                  <th>Nombre del Centro</th>
                  <th className="text-center" style={{ width: '150px' }}>Visibilidad</th>
                  <th className="text-center" style={{ width: '100px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredCentros.map(centro => (
                  <tr key={centro.id} className={!centro.visible ? 'bg-light text-muted' : ''}>
                    <td className="fw-500">
                      {centro.nombre}
                      {!centro.visible && <small className="d-block text-danger fst-italic">Oculto en búsquedas</small>}
                    </td>
                    <td className="text-center">
                      <Form.Check 
                        type="switch"
                        id={`switch-${centro.id}`}
                        checked={centro.visible}
                        onChange={() => handleToggle(centro.id)}
                        className="fs-4 d-flex justify-content-center"
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td className="text-center">
                      {centro.visible ? (
                        <Badge bg="success">Visible</Badge>
                      ) : (
                        <Badge bg="secondary">Oculto</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredCentros.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-muted">
                      No se encontraron centros con ese nombre.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};