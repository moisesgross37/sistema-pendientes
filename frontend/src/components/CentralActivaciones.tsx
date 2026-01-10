import { useState, useEffect } from 'react';
import { Container, Table, Button, Badge, Spinner, Alert, Card } from 'react-bootstrap';

// Definimos una interfaz simple para no tener errores de TS
interface CentroActivacion {
  id: number;
  nombre: string;
  padre: string;
  combos_logistica: string;
  lanzamiento_artes: string;
  lanzamiento_logistica: string;
  exterior_logistica: string;
  pre_logistica: string;
  graduacion_artes: string;
  graduacion_logistica: string;
}

export default function CentralActivaciones() {
  const [centros, setCentros] = useState<CentroActivacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. CARGAR LA MATRIZ AL INICIAR
  useEffect(() => {
    fetchMatriz();
  }, []);

  const fetchMatriz = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${apiUrl}/marketing/matriz-activaciones`);
      if (!res.ok) throw new Error('Error al conectar con la Torre de Control');
      const data = await res.json();
      setCentros(data);
      setLoading(false);
    } catch (error: any) {
      console.error("Error cargando matriz:", error);
      setErrorMsg("No se pudo conectar con el servidor. " + error.message);
      setLoading(false);
    }
  };

// 2. FUNCIÓN PARA ACTIVAR FASES (CONECTADA AL NUEVO MÓDULO)
  const activarFase = async (centroId: number, eventoKey: string, fase: string, nombreEvento: string, nombreCentro: string) => {
    const confirmacion = window.confirm(`⚠️ ¿Confirmas que deseas ACTIVAR la fase de ${nombreEvento} (${fase})?`);
    if (!confirmacion) return;

    // Construimos la KEY para buscar en la Matriz (Ej: LANZAMIENTO_ARTES)
    // Mapeamos los números raros a nombres legibles
    let eventoNombre = '';
    if (eventoKey === '1') eventoNombre = 'COMBOS';
    if (eventoKey === '2') eventoNombre = 'LANZAMIENTO';
    if (eventoKey === '3') eventoNombre = 'EXTERIOR';
    if (eventoKey === '4') eventoNombre = 'PRE_GRAD';
    if (eventoKey === '5') eventoNombre = 'GRADUACION';

    const faseKey = `${eventoNombre}_${fase}`; // Ej: GRADUACION_ARTES

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // 👇 LLAMADA AL NUEVO ENDPOINT LIMPIO
      const res = await fetch(`${apiUrl}/activaciones/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            nombreCentro: nombreCentro, // Necesitamos pasar el nombre del colegio
            faseKey: faseKey,
            userId: 1 // O el ID del usuario logueado
        })
      });
      
      if (res.ok) {
        alert("✅ Fase activada exitosamente. Se ha creado el ticket.");
        fetchMatriz(); 
      } else {
        const err = await res.json();
        alert("❌ Error: " + (err.message || "No se pudo activar."));
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

 // 3. RENDERIZADOR DE CELDAS (Modificado para recibir el Nombre del Centro)
  // 👇 Agregamos 'nombreCentro' al final de los paréntesis
  const renderCelda = (centroId: number, eventoKey: string, fase: 'ARTES' | 'GENERAL', estado: string, label: string, nombreCentro: string) => {
    
    // Caso 1: No existe
    if (estado === 'NO_EXISTE' || !estado) {
        return <span className="text-muted small" style={{ opacity: 0.5 }}>—</span>;
    }
    
    // Caso 2: Dormido / Standby
    if (estado === 'STANDBY') {
      return (
        <Button 
          variant={fase === 'ARTES' ? 'outline-primary' : 'outline-success'}
          size="sm"
          className="w-100 mb-1"
          style={{ fontSize: '0.75rem', fontWeight: 'bold' }}
          // 👇 AQUÍ EL CAMBIO: Pasamos 'nombreCentro' a la función activarFase
          onClick={() => activarFase(centroId, eventoKey, fase, label, nombreCentro)}
          title={`Click para despertar ${label}`}
        >
          ▶ {fase === 'ARTES' ? 'Diseño' : 'Activar'}
        </Button>
      );
    }

    // Caso 3: En Curso
    return <Badge bg="success" className="w-100 py-2">✅ En Curso</Badge>;
  };

  if (loading) return (
    <Container className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Conectando con la Matriz...</p>
    </Container>
  );

  return (
    <Container fluid className="py-4 bg-light min-h-screen">
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <div>
            <h2 className="fw-bold text-dark mb-0">🗼 Central de Activaciones</h2>
            <p className="text-muted mb-0 small">Panel de Control de Fases y Tiempos</p>
        </div>
        <div>
            <Button variant="secondary" size="sm" onClick={fetchMatriz}>
                🔄 Actualizar Tablero
            </Button>
        </div>
      </div>

      {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

      {/* TABLA PRINCIPAL */}
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
            <Table responsive hover bordered striped className="mb-0 align-middle">
            <thead className="bg-white text-uppercase small text-center">
                <tr style={{ height: '50px', verticalAlign: 'middle' }}>
                    <th className="bg-dark text-white text-start ps-3" style={{ width: '20%' }}>Centro / Colegio</th>
                    <th className="bg-light text-dark" style={{ width: '10%' }}>Responsable</th>
                    
                    {/* COLUMNAS DE EVENTOS CON COLORES */}
                    <th className="text-white" style={{ backgroundColor: '#2c3e50', width: '10%' }}>📸 Combos</th>
                    <th className="text-white" style={{ backgroundColor: '#6f42c1', width: '15%' }}>🚀 Lanzamiento</th>
                    <th className="text-white" style={{ backgroundColor: '#27ae60', width: '10%' }}>🌳 Exterior</th>
                    <th className="text-white" style={{ backgroundColor: '#e67e22', width: '10%' }}>🎓 Pre-Grad</th>
                    <th className="text-white" style={{ backgroundColor: '#c0392b', width: '15%' }}>🎉 Graduación</th>
                </tr>
            </thead>
            <tbody className="small">
                {centros.map((centro) => (
                <tr key={centro.id}>
                    {/* NOMBRE Y PADRE */}
                    <td className="fw-bold text-dark ps-3">{centro.nombre}</td>
                    <td className="text-center text-secondary">{centro.padre}</td>

                    {/* 📸 COMBOS */}
                    <td className="text-center">
                        {renderCelda(centro.id, '1', 'GENERAL', centro.combos_logistica, 'Combos', centro.nombre)}
                    </td>

                    {/* 🚀 LANZAMIENTO (Artes + General) */}
                    <td className="text-center table-active">
                        <div className="d-flex flex-column gap-1">
                            {/* 👇 AQUÍ FALTABA EL NOMBRE, YA LO PUSE: */}
                            {renderCelda(centro.id, '2', 'ARTES', centro.lanzamiento_artes, 'Lanzamiento (Artes)', centro.nombre)}
                            {renderCelda(centro.id, '2', 'GENERAL', centro.lanzamiento_logistica, 'Lanzamiento (Gral)', centro.nombre)}
                        </div>
                    </td>

                    {/* 🌳 EXTERIOR */}
                    <td className="text-center">
                        {/* 👇 AQUÍ TAMBIÉN FALTABA: */}
                        {renderCelda(centro.id, '3', 'GENERAL', centro.exterior_logistica, 'Exterior', centro.nombre)}
                    </td>

                    {/* 🎓 PRE-GRADUACIÓN */}
                    <td className="text-center">
                        {/* 👇 Y AQUÍ: */}
                        {renderCelda(centro.id, '4', 'GENERAL', centro.pre_logistica, 'Pre-Grad', centro.nombre)}
                    </td>

                    {/* 🎉 GRADUACIÓN */}
                    <td className="text-center table-warning">
                         <div className="d-flex flex-column gap-1">
                            {/* 👇 Y EN ESTOS DOS TAMBIÉN: */}
                            {renderCelda(centro.id, '5', 'ARTES', centro.graduacion_artes, 'Graduación (Artes)', centro.nombre)}
                            {renderCelda(centro.id, '5', 'GENERAL', centro.graduacion_logistica, 'Graduación (Gral)', centro.nombre)}
                        </div>
                    </td>

                </tr>
                ))}
                
                {centros.length === 0 && !loading && (
                    <tr>
                        <td colSpan={7} className="text-center py-5 text-muted">
                            No hay centros configurados para mostrar.
                        </td>
                    </tr>
                )}
            </tbody>
            </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}