import { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPage from './components/AdminPage';
import { Container, Card, Row, Col } from 'react-bootstrap';
import './App.css';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<'login' | 'dashboard' | 'admin'>('login');

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
    setView('dashboard');
  };

  if (!token) {
    return (
      // Contenedor principal que centra todo vertical y horizontalmente
      <Container fluid className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        {/* La columna ahora es más ancha en pantallas de escritorio */}
        <Col xs={12} sm={10} md={8} lg={6} xl={5}>
          <Card className="p-4 shadow-lg">
            <Card.Body>
              <h2 className="text-center mb-4">Relación de Pendientes / GESTIÓN</h2>
              <Login onLoginSuccess={handleLoginSuccess} />
            </Card.Body>
          </Card>
        </Col>
      </Container>
    );
  }

  // Vista principal de la aplicación una vez logueado
  return (
    <Container className="my-4">
      <h1 className="mb-3">Relación de Pendientes</h1>
      <hr className="mb-4" />
      {view === 'dashboard' && <Dashboard token={token} setView={setView} />}
      {view === 'admin' && <AdminPage token={token} setView={setView} />}
    </Container>
  );
}

export default App;