import React, { useState, useEffect } from 'react';
import { Table, Form, Badge, Spinner } from 'react-bootstrap';

// URL del Backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface EstadoEvento {
  fecha_realizacion: string | null;
  web_subida: string | null;
  redes_trabajadas: string | null;
  encuesta_directivo: string | null;
  encuesta_estudiante: string | null;
}

interface Props {
  nombreCentro: string;
}

export const MarketingHitos: React.FC<Props> = ({ nombreCentro }) => {
  const [marketingData, setMarketingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);

  // 1. Cargar datos al iniciar
  useEffect(() => {
    fetchData();
  }, [nombreCentro]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/marketing`);
      const data = await res.json();
      
      const encontrado = data.find((c: any) => 
        c.nombre_centro.trim().toLowerCase() === nombreCentro.trim().toLowerCase()
      );

      if (encontrado) {
        setMarketingData(encontrado);
      } else {
        // ⚡ SI NO EXISTE: Lo creamos AUTOMÁTICAMENTE (Silencioso)
        if (!creando) {
            crearExpedienteSilencioso();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!creando) setLoading(false);
    }
  };

  // 2. Función que crea el registro sin molestar al usuario
  const crearExpedienteSilencioso = async () => {
    setCreando(true);
    try {
        const payload = {
            nombre_centro: nombreCentro,
            directivo_nombre: '', directivo_tel: '', estudiante_nombre: '', estudiante_tel: ''
        };
        // Crear
        const res = await fetch(`${API_URL}/marketing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (res.ok) {
            // Volvemos a buscar los datos frescos inmediatamente
            const res2 = await fetch(`${API_URL}/marketing`);
            const data2 = await res2.json();
            const nuevo = data2.find((c: any) => c.nombre_centro.trim().toLowerCase() === nombreCentro.trim().toLowerCase());
            setMarketingData(nuevo);
        }
    } catch (error) {
        console.error("Error auto-creando marketing", error);
    } finally {
        setCreando(false);
        setLoading(false);
    }
  };

  // 3. Función para activar fechas (El Gatillo)
  const handleDateChange = async (eventoKey: string, nuevaFecha: string) => {
    if (!marketingData) return;
    const confirm = window.confirm(`¿Confirmas la fecha para ${eventoKey}?`);
    if (!confirm) return;

    try {
      const res = await fetch(`${API_URL}/marketing/${marketingData.id}/${eventoKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha_realizacion: nuevaFecha })
      });
      if (res.ok) fetchData(); 
    } catch (error) { alert('Error de conexión'); }
  };

  const renderStatus = (fecha: string | null, label: string) => {
    if (fecha) return <Badge bg="success">✅ {label}</Badge>;
    return <Badge bg="light" text="muted" className="border">⏳ Pendiente</Badge>;
  };

  // MIENTRAS CARGA O CREA, MOSTRAMOS UN SPINNER DISCRETO
  if (loading || creando || !marketingData) {
    return <div className="p-3 text-center text-muted"><Spinner animation="border" size="sm" /> Sincronizando datos de Marketing...</div>;
  }

  // TABLA VISIBLE (SIEMPRE APARECE)
  const eventos = [
    { key: 'combos', label: '📸 Combos' },
    { key: 'lanzamiento', label: '🚀 Lanzamiento' },
    { key: 'exterior', label: '🌳 Exterior' },
    { key: 'pre_graduacion', label: '🎓 Pre-Grad' },
    { key: 'graduacion', label: '🎉 Graduación' },
  ];

  return (
    <div className="card shadow-sm mt-4 border-primary border-opacity-25">
      <div className="card-header bg-primary bg-opacity-10 border-bottom-0 pt-3">
        <h6 className="mb-0 fw-bold text-primary">📅 Hitos de Marketing (Torre de Control)</h6>
      </div>
      <div className="table-responsive">
        <Table className="align-middle mb-0 text-center" hover size="sm">
          <thead className="bg-light text-secondary small text-uppercase">
            <tr>
              <th className="text-start ps-4">Evento</th>
              <th style={{width: '160px'}}>Fecha Activación</th>
              <th>Web</th>
              <th>Redes</th>
              <th>Encuestas</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map((evt) => {
              const data = marketingData.eventos_data[evt.key] || {};
              const fechaValue = data.fecha_realizacion ? String(data.fecha_realizacion).split('T')[0] : '';
              const rowOpacity = fechaValue ? 1 : 0.5;

              return (
                <tr key={evt.key}>
                  <td className="text-start ps-4 fw-bold text-dark">{evt.label}</td>
                  <td>
                    <Form.Control 
                      type="date" size="sm" value={fechaValue}
                      onChange={(e) => handleDateChange(evt.key, e.target.value)}
                      className={fechaValue ? "border-success fw-bold text-success bg-success bg-opacity-10" : ""}
                    />
                  </td>
                  <td style={{opacity: rowOpacity}}>{renderStatus(data.web_subida, 'Listo')}</td>
                  <td style={{opacity: rowOpacity}}>{renderStatus(data.redes_trabajadas, 'Listo')}</td>
                  <td style={{opacity: rowOpacity}}>
                      <div className="d-flex gap-1 justify-content-center flex-column">
                        {renderStatus(data.encuesta_directivo, 'Dir.')}
                        {renderStatus(data.encuesta_estudiante, 'Est.')}
                      </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
};