import React, { useState, useEffect } from 'react';
import { Container, Button, Modal, Form, Table, Badge, OverlayTrigger, Tooltip, Row, Col } from 'react-bootstrap';

// URL del Backend
const API_URL = 'http://localhost:3000'; 

// --- INTERFACES DE DATOS ---
interface EstadoEvento {
  fecha_realizacion: string | null;
  web_subida: string | null;
  redes_trabajadas: string | null;
  encuesta_directivo: string | null;
  encuesta_estudiante: string | null;
}

interface MarketingCliente {
  id: number;
  nombre_centro: string;
  directivo_nombre: string;
  directivo_tel: string;
  estudiante_nombre: string;
  estudiante_tel: string;
  eventos_data: {
    combos?: EstadoEvento;
    lanzamiento?: EstadoEvento;
    exterior?: EstadoEvento;
    pre_graduacion?: EstadoEvento;
    graduacion?: EstadoEvento;
  };
}

interface Props {
  onBack: () => void;
}

export const MarketingPanel: React.FC<Props> = ({ onBack }) => {
  const [clientes, setClientes] = useState<MarketingCliente[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para Crear Cliente
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClientData, setNewClientData] = useState({
    nombre_centro: '', directivo_nombre: '', directivo_tel: '', estudiante_nombre: '', estudiante_tel: ''
  });

  // Estados para Editar Info Básica
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClientData, setEditingClientData] = useState<MarketingCliente | null>(null);

  // Estado para EDICIÓN RÁPIDA (El Clic en el Puntito)
  const [quickEdit, setQuickEdit] = useState<{
    cliente: MarketingCliente;
    eventoKey: string;
    eventoLabel: string;
  } | null>(null);

  // Cargar datos
  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/marketing`);
      if (res.ok) setClientes(await res.json());
    } catch (error) {
      console.error("Error cargando clientes", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newClientData.nombre_centro) return alert("Nombre obligatorio");
    try {
      await fetch(`${API_URL}/marketing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientData)
      });
      setShowCreateModal(false);
      setNewClientData({ nombre_centro: '', directivo_nombre: '', directivo_tel: '', estudiante_nombre: '', estudiante_tel: '' });
      fetchClientes();
    } catch (error) { alert("Error al crear"); }
  };

  const handleUpdateBasicInfo = async () => {
    if (!editingClientData) return;
    try {
      const res = await fetch(`${API_URL}/marketing/${editingClientData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nombre_centro: editingClientData.nombre_centro,
            directivo_nombre: editingClientData.directivo_nombre,
            directivo_tel: editingClientData.directivo_tel,
            estudiante_nombre: editingClientData.estudiante_nombre,
            estudiante_tel: editingClientData.estudiante_tel
        })
      });
      
      if (res.ok) {
        setShowEditModal(false);
        fetchClientes(); 
      } else {
        alert("Error al actualizar");
      }
    } catch (error) {
      console.error("Error updating client", error);
    }
  };

  const updateEvento = async (clienteId: number, eventoKey: string, payload: any) => {
    try {
        const res = await fetch(`${API_URL}/marketing/${clienteId}/${eventoKey}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) fetchClientes(); 
    } catch (error) { console.error("Error updating", error); }
  };

  const getCellStatus = (data: EstadoEvento | undefined) => {
    if (!data || !data.fecha_realizacion) return 'gris';

    const todoListo = data.web_subida && data.redes_trabajadas && data.encuesta_directivo && data.encuesta_estudiante;
    if (todoListo) return 'verde';

    const fechaEvento = new Date(data.fecha_realizacion).getTime();
    const hoy = new Date().getTime();
    const diffDias = Math.ceil((hoy - fechaEvento) / (1000 * 3600 * 24));

    if (diffDias > 2) return 'rojo';
    return 'amarillo';
  };

  const renderDot = (status: string, onClick: () => void) => {
    let color = '#e9ecef'; 
    let title = 'Sin Iniciar';
    
    if (status === 'verde') { color = '#28a745'; title = 'Completado'; }
    if (status === 'amarillo') { color = '#ffc107'; title = 'En Proceso'; }
    if (status === 'rojo') { color = '#dc3545'; title = 'Tardío / Atención'; }

    return (
      <OverlayTrigger overlay={<Tooltip>{title}</Tooltip>}>
        <div 
            onClick={onClick}
            style={{
                width: '24px', height: '24px', borderRadius: '50%', 
                backgroundColor: color, margin: '0 auto', cursor: 'pointer',
                border: '2px solid rgba(0,0,0,0.1)',
                boxShadow: status === 'rojo' || status === 'amarillo' ? '0 0 5px rgba(0,0,0,0.2)' : 'none'
            }}
        />
      </OverlayTrigger>
    );
  };

  const eventosCols = [
    { key: 'combos', label: '📸 Combos' },
    { key: 'lanzamiento', label: '🚀 Lanzamiento' },
    { key: 'exterior', label: '🌳 Exterior' },
    { key: 'pre_graduacion', label: '🎓 Pre-Grad' },
    { key: 'graduacion', label: '🎉 Graduación' }
  ];

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '50px' }}>
      
      <div className="text-white p-3 shadow-sm mb-4" style={{ backgroundColor: '#563d7c' }}>
        <Container fluid className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
                <Button variant="outline-light" size="sm" onClick={onBack}>⬅ Volver</Button>
                <h4 className="m-0 fw-bold">📡 Torre de Control Marketing</h4>
                <Badge bg="light" text="dark" pill>{clientes.length} Centros</Badge>
            </div>
            <Button variant="warning" size="sm" className="fw-bold" onClick={() => setShowCreateModal(true)}>➕ Nuevo Centro</Button>
        </Container>
      </div>

      <Container fluid>
        {/* Usamos la variable loading aquí para que TS no se queje */}
        {loading && <div className="text-center py-3 text-muted">Cargando datos...</div>}

        <div className="bg-white rounded shadow-sm p-3">
          <Table hover responsive className="align-middle text-center mb-0">
            <thead className="bg-light text-secondary">
                <tr>
                    <th className="text-start ps-3" style={{width: '25%'}}>Centro Educativo</th>
                    {eventosCols.map(col => <th key={col.key}>{col.label}</th>)}
                </tr>
            </thead>
            <tbody>
                {!loading && clientes.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-5 text-muted">No hay datos. ¡Crea el primer centro!</td></tr>
                ) : (
                    clientes.map(cliente => (
                        <tr key={cliente.id}>
                            <td className="text-start ps-3">
                                <div className="d-flex align-items-center justify-content-between">
                                    <div>
                                        <div className="fw-bold text-dark">{cliente.nombre_centro}</div>
                                        <div className="small text-muted" style={{fontSize: '0.75rem'}}>
                                            {cliente.directivo_nombre ? `👔 ${cliente.directivo_nombre}` : ''}
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="text-muted p-0 ms-2"
                                        style={{ textDecoration: 'none' }}
                                        onClick={() => {
                                            setEditingClientData(cliente);
                                            setShowEditModal(true);
                                        }}
                                    >
                                        ✏️
                                    </Button>
                                </div>
                            </td>
                            {eventosCols.map(col => {
                                const data = cliente.eventos_data[col.key as keyof typeof cliente.eventos_data];
                                const status = getCellStatus(data);
                                return (
                                    <td key={col.key}>
                                        {renderDot(status, () => setQuickEdit({ cliente, eventoKey: col.key, eventoLabel: col.label }))}
                                    </td>
                                );
                            })}
                        </tr>
                    ))
                )}
            </tbody>
          </Table>
        </div>
      </Container>

      {/* MODAL DE EDICIÓN RÁPIDA */}
      <Modal show={quickEdit !== null} onHide={() => setQuickEdit(null)} centered size="sm">
        {quickEdit && (() => {
            const clienteFresco = clientes.find(c => c.id === quickEdit.cliente.id) || quickEdit.cliente;
            // 👇 AQUÍ ESTABA EL ERROR: Agregamos 'as EstadoEvento' para que TS entienda el objeto vacío
            const data = (clienteFresco.eventos_data[quickEdit.eventoKey as keyof typeof clienteFresco.eventos_data] || {}) as EstadoEvento;
            
            const isLocked = !data.fecha_realizacion;

            return (
                <>
                    <Modal.Header closeButton className="bg-light">
                        <Modal.Title style={{fontSize: '1rem'}}>
                            <strong>{clienteFresco.nombre_centro}</strong><br/>
                            <span className="text-primary">{quickEdit.eventoLabel}</span>
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-bold">📅 Fecha del Evento</Form.Label>
                            <Form.Control 
                                type="date" 
                                size="sm"
                                value={data.fecha_realizacion ? String(data.fecha_realizacion).split('T')[0] : ''}
                                disabled={!isLocked} 
                                onChange={(e) => {
                                    if(window.confirm("¿Confirmas la fecha? Esto activará el semáforo.")) {
                                        updateEvento(clienteFresco.id, quickEdit.eventoKey, { fecha_realizacion: e.target.value });
                                    }
                                }}
                            />
                            {isLocked && <small className="text-muted d-block mt-1">Ingresa fecha para desbloquear tareas.</small>}
                        </Form.Group>

                        {!isLocked && (
                            <div className="d-grid gap-2">
                                <Button 
                                    variant={data.web_subida ? "success" : "outline-secondary"} 
                                    size="sm"
                                    className="d-flex justify-content-between align-items-center"
                                    onClick={() => updateEvento(clienteFresco.id, quickEdit.eventoKey, { web_subida: new Date().toISOString() })}
                                    disabled={!!data.web_subida}
                                >
                                    <span>🌐 Cargar Web</span>
                                    {data.web_subida && <span>✅ Listo</span>}
                                </Button>

                                <Button 
                                    variant={data.redes_trabajadas ? "success" : "outline-secondary"} 
                                    size="sm"
                                    className="d-flex justify-content-between align-items-center"
                                    onClick={() => updateEvento(clienteFresco.id, quickEdit.eventoKey, { redes_trabajadas: new Date().toISOString() })}
                                    disabled={!!data.redes_trabajadas}
                                >
                                    <span>📸 Redes Sociales</span>
                                    {data.redes_trabajadas && <span>✅ Listo</span>}
                                </Button>

                                <Button 
                                    variant={data.encuesta_directivo ? "success" : "outline-secondary"} 
                                    size="sm"
                                    className="d-flex justify-content-between align-items-center"
                                    onClick={() => updateEvento(clienteFresco.id, quickEdit.eventoKey, { encuesta_directivo: new Date().toISOString() })}
                                    disabled={!!data.encuesta_directivo}
                                >
                                    <span>📩 Encuesta Dir.</span>
                                    {data.encuesta_directivo && <span>✅ Enviada</span>}
                                </Button>

                                <Button 
                                    variant={data.encuesta_estudiante ? "success" : "outline-secondary"} 
                                    size="sm"
                                    className="d-flex justify-content-between align-items-center"
                                    onClick={() => updateEvento(clienteFresco.id, quickEdit.eventoKey, { encuesta_estudiante: new Date().toISOString() })}
                                    disabled={!!data.encuesta_estudiante}
                                >
                                    <span>📩 Encuesta Est.</span>
                                    {data.encuesta_estudiante && <span>✅ Enviada</span>}
                                </Button>
                            </div>
                        )}
                    </Modal.Body>
                </>
            );
        })()}
      </Modal>

      {/* MODAL CREAR */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Registrar Nuevo Centro</Modal.Title></Modal.Header>
        <Modal.Body>
            <Form>
                <Form.Group className="mb-3"><Form.Label>Nombre Centro</Form.Label><Form.Control value={newClientData.nombre_centro} onChange={e => setNewClientData({...newClientData, nombre_centro: e.target.value})} /></Form.Group>
                <Row><Col><Form.Control placeholder="Nombre Directivo" value={newClientData.directivo_nombre} onChange={e => setNewClientData({...newClientData, directivo_nombre: e.target.value})} className="mb-2"/></Col><Col><Form.Control placeholder="Teléfono" value={newClientData.directivo_tel} onChange={e => setNewClientData({...newClientData, directivo_tel: e.target.value})} /></Col></Row>
                <Row><Col><Form.Control placeholder="Nombre Estudiante" value={newClientData.estudiante_nombre} onChange={e => setNewClientData({...newClientData, estudiante_nombre: e.target.value})} className="mb-2"/></Col><Col><Form.Control placeholder="Teléfono" value={newClientData.estudiante_tel} onChange={e => setNewClientData({...newClientData, estudiante_tel: e.target.value})} /></Col></Row>
            </Form>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="primary" onClick={handleCreate}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL EDITAR INFO BÁSICA */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton className="bg-warning bg-opacity-10">
            <Modal.Title>✏️ Editar Información</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            {editingClientData && (
                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label>Nombre Centro</Form.Label>
                        <Form.Control 
                            value={editingClientData.nombre_centro} 
                            onChange={e => setEditingClientData({...editingClientData, nombre_centro: e.target.value})} 
                        />
                    </Form.Group>
                    <Row>
                        <Col>
                            <Form.Group className="mb-2">
                                <Form.Label className="small text-muted">Directivo</Form.Label>
                                <Form.Control size="sm" value={editingClientData.directivo_nombre || ''} onChange={e => setEditingClientData({...editingClientData, directivo_nombre: e.target.value})} />
                            </Form.Group>
                        </Col>
                        <Col>
                            <Form.Group className="mb-2">
                                <Form.Label className="small text-muted">Tel. Directivo</Form.Label>
                                <Form.Control size="sm" value={editingClientData.directivo_tel || ''} onChange={e => setEditingClientData({...editingClientData, directivo_tel: e.target.value})} />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Form.Group className="mb-2">
                                <Form.Label className="small text-muted">Estudiante</Form.Label>
                                <Form.Control size="sm" value={editingClientData.estudiante_nombre || ''} onChange={e => setEditingClientData({...editingClientData, estudiante_nombre: e.target.value})} />
                            </Form.Group>
                        </Col>
                        <Col>
                            <Form.Group className="mb-2">
                                <Form.Label className="small text-muted">Tel. Estudiante</Form.Label>
                                <Form.Control size="sm" value={editingClientData.estudiante_tel || ''} onChange={e => setEditingClientData({...editingClientData, estudiante_tel: e.target.value})} />
                            </Form.Group>
                        </Col>
                    </Row>
                </Form>
            )}
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancelar</Button>
            <Button variant="warning" onClick={handleUpdateBasicInfo}>Guardar Cambios</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
};