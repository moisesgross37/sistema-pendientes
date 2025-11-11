// frontend/src/App.tsx
import { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPage from './components/AdminPage';
import AdminEstados from './components/AdminEstados'; // <--- 1. IMPORTACIÓN AÑADIDA
import { Container, Card, Col, Button } from 'react-bootstrap';
import './App.css';

// --- 👇 2. TIPO DE VISTA ACTUALIZADO ---
export type AppView = 'login' | 'dashboard' | 'admin' | 'admin-estados';

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('authToken'),
  );

  const [view, setView] = useState<AppView>(
    token ? 'dashboard' : 'login',
  );
  // --- 👆 ---

  const handleLoginSuccess = (newToken: string) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    // (setView('login') no es necesario, el 'if (!token)' se encargará)
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
                Relación de Pendientes / GESTIÓN
              </h2>
              <Login onLoginSuccess={handleLoginSuccess} />
            </Card.Body>
          </Card>
        </Col>
      </Container>
    );
  }

  return (
    <Container className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="m-0">Relación de Pendientes</h1>
        <Button variant="outline-secondary" size="sm" onClick={handleLogout}>
          Cerrar Sesión
        </Button>
      </div>
      <hr className="mb-4" />

      {/* --- 👇 3. LÓGICA DE RENDERIZADO ACTUALIZADA --- */}
      {view === 'dashboard' && <Dashboard token={token} setView={setView} />}
      {view === 'admin' && <AdminPage token={token} setView={setView} />}
      {view === 'admin-estados' && <AdminEstados token={token} setView={setView} />}
      {/* --- 👆 --- */}
    </Container>
  );
}

export default App;