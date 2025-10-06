import { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

function Login({ onLoginSuccess }: LoginProps) {
  // Campos inicializados VACÍOS
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:3007/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }
      onLoginSuccess(data.access_token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h2 className="mb-4">Login</h2> {/* Mantuvimos el h2 aquí por la estructura, el h2 del App es el principal */}
      <Form.Group className="mb-3" controlId="formUsername">
        <Form.Label>Nombre de Usuario</Form.Label>
        <Form.Control
          type="text"
          placeholder="Escribe tu usuario" // Placeholder más claro
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="formPassword">
        <Form.Label>Contraseña</Form.Label>
        <Form.Control
          type="password"
          placeholder="Escribe tu contraseña" // Placeholder más claro
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Form.Group>

      <Button variant="primary" type="submit" className="w-100">
        Entrar
      </Button>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
    </Form>
  );
}

export default Login;