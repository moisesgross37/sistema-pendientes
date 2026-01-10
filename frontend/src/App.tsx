// frontend/src/App.tsx
import { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPage from './components/AdminPage';
import AdminEstados from './components/AdminEstados';
// 👇 1. IMPORTAR EL NUEVO COMPONENTE
import CentralActivaciones from './components/CentralActivaciones'; 

import { Container, Card, Col, Button } from 'react-bootstrap';
import './App.css';

// 👇 2. AGREGAR EL NOMBRE DE LA VISTA AQUÍ
export type AppView = 'login' | 'dashboard' | 'admin' | 'admin-estados' | 'central-activaciones';

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('authToken'),
  );

  const [view, setView] = useState<AppView>(
    token ? 'dashboard' : 'login',
  );

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
  };

  if (!token) {
    return (
      <Container
        fluid
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: '100vh' }}
      >
        <Col xs={12} sm={10} md={8} lg={6} xl={5}>
          <Card className="p-4 shadow-lg">
            <Card.Body>
              <h2 className="text-center mb-4">
                Sistema Pendientes / GESTIÓN
              </h2>
              <Login onLoginSuccess={handleLoginSuccess} />
            </Card.Body>
          </Card>
        </Col>
      </Container>
    );
  }

  return (
    <>
      {/* 1. EL DASHBOARD */}
      {view === 'dashboard' && <Dashboard token={token} setView={setView} />}

      {/* 2. PANTALLAS DE ADMIN */}
      {view === 'admin' && (
        <Container className="my-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
             <h3>Administración</h3>
             <Button variant="outline-secondary" size="sm" onClick={handleLogout}>Cerrar Sesión</Button>
          </div>
          <AdminPage token={token} setView={setView} />
        </Container>
      )}

      {view === 'admin-estados' && (
        <Container className="my-4">
           <div className="d-flex justify-content-between align-items-center mb-3">
             <h3>Gestión de Estados</h3>
             <Button variant="outline-secondary" size="sm" onClick={() => setView('admin')}>Volver</Button>
          </div>
          <AdminEstados token={token} setView={setView} />
        </Container>
      )}

      {/* 👇 3. NUEVA VISTA: CENTRAL DE ACTIVACIONES */}
      {view === 'central-activaciones' && (
        // Usamos 'fluid' para que la tabla tenga espacio a lo ancho
        <Container fluid className="p-0"> 
          {/* Botón flotante o barra superior para volver */}
          <div className="bg-white p-3 shadow-sm d-flex justify-content-between align-items-center mb-0">
             <h4 className="m-0 text-primary">🗼 Torre de Control</h4>
             <Button variant="outline-dark" size="sm" onClick={() => setView('dashboard')}>
               ⬅ Volver al Dashboard
             </Button>
          </div>
          
          <CentralActivaciones />
        </Container>
      )}
    </>
  );
}

export default App;