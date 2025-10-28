import { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
// 👇 AÑADIMOS Tabs y Tab
import { Button, Table, Form, Modal, Card, Alert, Row, Col, Badge, ListGroup, Tabs, Tab } from 'react-bootstrap';

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

  // 👇 AÑADIMOS UN ESTADO NUEVO PARA GUARDAR SOLO A LOS COLABORADORES
  const [colaboradores, setColaboradores] = useState<Usuario[]>([]);

  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [filtroAsesor, setFiltroAsesor] = useState('');
  const [filtroAsignado] = useState<string>('');('');
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
      if (!res.ok) {
        // Este error ahora es esperado si entra un 'Asesor'
        const errorData = await res.json();
        console.warn('Advertencia al cargar usuarios:', errorData.message);
        // No lo ponemos como error crítico
        // setError('No se pudo cargar la lista de usuarios.'); 
        return; // Salimos de la función si no es admin/colaborador
      }
      const usersData = await res.json();
      setAllUsers(usersData);

      // 👇 RELLENAMOS EL NUEVO ESTADO 'colaboradores'
      const collabUsers = usersData.filter((user: Usuario) => user.rol === 'Colaborador');
      setColaboradores(collabUsers);

    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    try {
      const decodedToken: DecodedToken = jwtDecode(token);
      setUserRole(decodedToken.rol);
      fetchPendientes();
      
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
      else acc[colaborador.id].normal++;
      acc[colaborador.id].total++;
      return acc;
    }, {} as Record<string, { username: string; normal: number; urgente: number; critico: number; total: number; }>);

  const performanceArray = Object.values(performanceData);

  // ================================================================
  // ===== 🚀 INICIO DE LA NUEVA FUNCIÓN REUTILIZABLE 🚀 =====
  // ================================================================
  /**
   * Esta función renderiza la tabla de pendientes activos,
   * pero filtrada para una pestaña específica.
   */
  const renderPendientesTable = (
    pendientesFiltrados: Pendiente[], 
    showFilters: boolean = false // Solo mostraremos los filtros en la pestaña "Todos"
  ) => (
    <>
      {/* Mostramos los filtros solo si 'showFilters' es verdadero */}
      {showFilters && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>Filtros</Card.Title>
            <Form>
              <Row>
                <Col md={4}><Form.Group><Form.Label>Filtrar por Asesor</Form.Label><Form.Select value={filtroAsesor} onChange={e => setFiltroAsesor(e.target.value)}><option value="">Todos</option>{[...new Map(pendientes.map(p => [p.asesor.id, p.asesor])).values()].map(asesor => (<option key={asesor.id} value={asesor.id}>{asesor.username}</option>))}</Form.Select></Form.Group></Col>
                
                {/* Ocultamos este filtro ya que la pestaña se encargará de esto */}
                {/* <Col md={4}><Form.Group><Form.Label>Filtrar por Asignado a</Form.Label><Form.Select value={filtroAsignado} onChange={e => setFiltroAsignado(e.target.value)}><option value="">Todos</option><option value="ninguno">Sin Asignar</option>{colaboradores.map(colaborador => (<option key={colaborador.id} value={colaborador.id}>{colaborador.username}</option>))}</Form.Select></Form.Group></Col> */}
                
                <Col md={4}><Form.Group><Form.Label>Filtrar por Días</Form.Label><Form.Select value={filtroDias} onChange={e => setFiltroDias(e.target.value)}><option value="">Todos</option><option value="0-4">Menos de 5 días (Normal)</option><option value="5-9">Entre 5 y 9 días (Urgente)</option><option value="10+">10 días o más (Crítico)</option></Form.Select></Form.Group></Col>
              </Row>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* La tabla de pendientes */}
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha Creación</th>
            <th>Días Transcurridos</th>
            <th>Centro</th>
            <th>Asesor</th>
            <th>Archivos</th>
            <th>Descripción</th>
            <th>Asignado a</th>
            <th>Fecha Asignación</th>
            <th>Estado</th>
            {(userRole === 'Administrador' || userRole === 'Colaborador') && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {pendientesFiltrados.map((p) => {
            const fechaCreacion = new Date(p.fechaCreacion);
            const hoy = new Date();
            fechaCreacion.setHours(0, 0, 0, 0);
            hoy.setHours(0, 0, 0, 0);
            const diffTiempo = hoy.getTime() - fechaCreacion.getTime();
            const diffDias = Math.ceil(diffTiempo / (1000 * 3600 * 24));
            let diasColor = '';
            if (diffDias >= 10) { diasColor = '#ffcccb'; } 
            else if (diffDias >= 5) { diasColor = '#ffebcc'; } 
            else { diasColor = '#d4edda'; }

            return (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{new Date(p.fechaCreacion).toLocaleDateString()}</td>
                <td style={{ backgroundColor: diasColor, fontWeight: 'bold' }}>{diffDias}</td>
                <td>{p.nombreCentro}</td>
                <td>{p.asesor.username}</td>
                <td>
                  {p.imagenes && p.imagenes.length > 0 && (
                    <Button variant="info" size="sm" onClick={() => setViewingImages(p.imagenes!)}>
                      Ver ({p.imagenes.length})
                    </Button>
                  )}
                </td>
                <td>{p.descripcion}</td>
                <td>
                  {p.colaboradorAsignado ? p.colaboradorAsignado.username : <span style={{ color: '#888' }}>No asignado</span>}
                </td>
                <td>{p.fechaAsignacion ? new Date(p.fechaAsignacion).toLocaleDateString() : '-'}</td>
                <td>{p.status}</td>
                {(userRole === 'Administrador' || userRole === 'Colaborador') && (
                  <td>
                    <Button variant="outline-primary" size="sm" onClick={() => handleOpenUpdateModal(p)} className="me-2">
                      Actualizar
                    </Button>
                    {userRole === 'Administrador' && (
                      <Button variant="outline-danger" size="sm" onClick={() => handleDeletePendiente(p.id)}>
                        Eliminar
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
      
      {/* Mensaje si la tabla está vacía */}
      {pendientesFiltrados.length === 0 && (
        <Alert variant="info">No hay pendientes para mostrar en esta vista.</Alert>
      )}
    </>
  );
  // ================================================================
  // ===== 🚀 FIN DE LA NUEVA FUNCIÓN REUTILIZABLE 🚀 =====
  // ================================================================


  return (
    <div>
      {userRole === 'Administrador' && (
        <Button variant="secondary" onClick={() => setView('admin')} className="mb-3">
          Gestionar Usuarios
        </Button>
      )}

      <h2>Dashboard Principal</h2>
      <p>¡Bienvenido! Has iniciado sesión como: <strong>{userRole}</strong></p>
      <hr />
      
      <>
        <h3>Desempeño de Colaboradores</h3>
        <Row className="mb-4">
          {performanceArray.length > 0 ? performanceArray.map((colab: any) => (
            <Col md={6} lg={4} key={colab.username} className="mb-3">
              <Card>
                <Card.Header as="h5">{colab.username}</Card.Header>
                <Card.Body>
                  <Card.Text>Total Asignados: <strong>{colab.total}</strong></Card.Text>
                  <div className="d-flex justify-content-around">
                    <Badge bg="success" className="p-2">Normal ({colab.normal})</Badge>
                    <Badge bg="warning" className="p-2 text-dark">Urgente ({colab.urgente})</Badge>
                    <Badge bg="danger" className="p-2">Crítico ({colab.critico})</Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          )) : <p>No hay pendientes asignados para mostrar métricas.</p>}
        </Row>
        <hr />
      </>
      
      {(userRole === 'Asesor' || userRole === 'Administrador') && (
        <div className="mb-4">
          <Button variant="primary" onClick={() => setShowCreateForm(!showCreateForm)} className="mb-3">
            {showCreateForm ? 'Cancelar Creación' : 'Crear Nuevo Pendiente'}
          </Button>
          {showCreateForm && (
            <Card>
              <Card.Body>
                <Card.Title>Nuevo Pendiente</Card.Title>
                <Form onSubmit={handleCreateSubmit}>
                  <Form.Group className="mb-3"><Form.Label>Nombre del Centro</Form.Label><Form.Control type="text" value={newNombreCentro} onChange={(e) => setNewNombreCentro(e.target.value)} required /></Form.Group>
                  <Form.Group className="mb-3"><Form.Label>Descripción</Form.Label><Form.Control as="textarea" rows={3} value={newDescripcion} onChange={(e) => setNewDescripcion(e.target.value)} required /></Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Adjuntar Imágenes (Opcional)</Form.Label>
                    <Form.Control type="file" ref={fileInputRef} multiple onChange={handleFileChange} />
                  </Form.Group>
                  {selectedFiles.length > 0 && (
                    <ListGroup className="mb-3">
                    D {selectedFiles.map((file, index) => (
                        <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                          {file.name}
                          <Button variant="danger" size="sm" onClick={() => handleRemoveFile(index)}>X</Button>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                  <Button variant="success" type="submit">Guardar Pendiente</Button>
                </Form>
              </Card.Body>
            </Card>
          )}
        </div>
      )}
      
      <h3>Lista de Pendientes Activos</h3>
      {error && <Alert variant="danger">{error}</Alert>}


<h3>Lista de Pendientes Activos</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* ================================================================
        ===== 🚀 INICIO DE LA NUEVA SECCIÓN DE PESTAÑAS 🚀 =====
        ================================================================
        Reemplazamos los filtros y la tabla única con este 
        componente de Pestañas (Tabs).
      */}
      <Tabs defaultActiveKey="todos" id="pendientes-tabs" className="mb-3" fill>
        
        {/* Pestaña "Todos" */}
        <Tab eventKey="todos" title={<><strong>Todos</strong> ({pendientesActivos.length})</>}>
          {/* Llamamos a la función que creamos en el bloque 2.
            Le pasamos 'pendientesActivos' (que ya respeta los filtros de Asesor y Días)
            y le decimos 'true' para que SÍ muestre los filtros.
          */}
          {renderPendientesTable(pendientesActivos, true)}
        </Tab>

        {/* Pestaña "Sin Asignar" */}
        <Tab 
          eventKey="sin-asignar" 
          title={<>Sin Asignar ({pendientesActivos.filter(p => !p.colaboradorAsignado).length})</>}
        >
          {/* Filtramos la lista solo para esta pestaña y la enviamos a la función.
            No mostramos los filtros aquí ('false' es el default).
          */}
          {renderPendientesTable(
            pendientesActivos.filter(p => !p.colaboradorAsignado)
          )}
        </Tab>

        {/* Pestañas dinámicas para cada Colaborador */}
        {colaboradores.map(colab => {
          const pendientesDelColab = pendientesActivos.filter(
            p => p.colaboradorAsignado?.id === colab.id
          );
          return (
            <Tab 
              eventKey={colab.id.toString()} 
              title={<>{colab.username} ({pendientesDelColab.length})</>} 
              key={colab.id}
            >
              {renderPendientesTable(pendientesDelColab)}
            </Tab>
          );
        })}
      </Tabs>
      {/* ================================================================
        ===== 🚀 FIN DE LA NUEVA SECCIÓN DE PESTAÑAS 🚀 =====
        ================================================================
      */}



      <hr className="my-5" />
      <h3>Historial de Pendientes Concluidos</h3>
      
      <Table striped bordered hover responsive size="sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Fecha Creación</th>
            <th>Fecha Asignación</th>
            <th>Fecha Conclusión</th>
            <th>Tiempo de Realización</th>
            <th>Centro</th>
            <th>Asesor</th>
            <th>Archivos</th>
            <th>Descripción</th>
            <th>Asignado a</th>
            {userRole === 'Administrador' && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {pendientesConcluidos.map((p) => {
            let tiempoRealizacion = '-';
            if (p.fechaAsignacion && p.fechaConclusion) {
              const fechaAsignacion = new Date(p.fechaAsignacion);
              const fechaConclusion = new Date(p.fechaConclusion);
              fechaAsignacion.setHours(0, 0, 0, 0);
              fechaConclusion.setHours(0, 0, 0, 0);
              const diffTiempo = fechaConclusion.getTime() - fechaAsignacion.getTime();
              const diffDias = Math.ceil(diffTiempo / (1000 * 3600 * 24));
              tiempoRealizacion = `${diffDias} día(s)`;
            }

            return (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{new Date(p.fechaCreacion).toLocaleDateString()}</td>
                <td>{p.fechaAsignacion ? new Date(p.fechaAsignacion).toLocaleDateString() : '-'}</td>
                <td>{p.fechaConclusion ? new Date(p.fechaConclusion).toLocaleDateString() : '-'}</td>
                <td>{tiempoRealizacion}</td>
                <td>{p.nombreCentro}</td>
                <td>{p.asesor.username}</td>
                <td>
                  {p.imagenes && p.imagenes.length > 0 && (
                    <Button variant="info" size="sm" onClick={() => setViewingImages(p.imagenes!)}>
                      Ver ({p.imagenes.length})
                    </Button>
                  )}
                </td>
                <td>{p.descripcion}</td>
                <td>{p.colaboradorAsignado ? p.colaboradorAsignado.username : 'N/A'}</td>
                {userRole === 'Administrador' && (
                  <td>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDeletePendiente(p.id)}>
                      Eliminar
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>
      
      <Modal show={editingPendiente !== null} onHide={() => setEditingPendiente(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Actualizar Pendiente #{editingPendiente?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Estado</Form.Label>
              <Form.Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
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
                <Form.Select value={selectedColaboradorId} onChange={(e) => setSelectedColaboradorId(e.target.value)}>
                  <option value="">-- Sin Asignar --</option>
                  {allUsers
                    .filter(user => user.rol === 'Colaborador')
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                </Form.Select>
              </Form.Group>
            )}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setEditingPendiente(null)}>Cancelar</Button>
              <Button variant="primary" type="submit">Guardar Cambios</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={viewingImages !== null} onHide={() => setViewingImages(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Archivos Adjuntos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewingImages?.map((imageName, index) => (
            <div key={index} className="mb-3 text-center">
              <a href={`https://sistema-pendientes.onrender.com/pendientes/uploads/${imageName}`} target="_blank" rel="noopener noreferrer">
                <img 
                  src={`https://sistema-pendientes.onrender.com/pendientes/uploads/${imageName}`} 
                  alt={`Adjunto ${index + 1}`} 
                  style={{ maxWidth: '100%', maxHeight: '400px', border: '1px solid #ddd' }}
                />
                <p><small>Ver en tamaño completo</small></p>
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
    </div>
  );
}

export default Dashboard;
