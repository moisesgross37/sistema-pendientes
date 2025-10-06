import { useState, useEffect } from 'react';

// --- Interfaces ---
interface AdminPageProps {
  token: string;
  setView: (view: string) => void;
}

interface Usuario {
  id: number;
  username: string;
  nombreCompleto: string;
  rol: string;
}

// --- Componente ---
function AdminPage({ token, setView }: AdminPageProps) {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [error, setError] = useState('');

  // Estados para el formulario de creación
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rol, setRol] = useState('Asesor');

  // Función para obtener la lista de usuarios
  const fetchUsers = async () => {
    setError('');
    try {
      const res = await fetch('https://sistema-pendientes.onrender.com/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('No se pudo cargar la lista de usuarios. ¿Estás seguro de que eres Administrador?');
      }
      setUsers(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  };

  // useEffect se ejecuta una vez al cargar el componente para traer la lista
  useEffect(() => {
    fetchUsers();
  }, [token]);

  // Función para manejar la creación de un nuevo usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('https://sistema-pendientes.onrender.com/usuarios', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombreCompleto, username, password, rol }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'No se pudo crear el usuario.');
      }
      // Limpiamos el formulario
      setNombreCompleto('');
      setUsername('');
      setPassword('');
      // ¡Magia! Volvemos a pedir la lista para que se actualice
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <button onClick={() => setView('dashboard')} style={{ marginBottom: '1em' }}>&larr; Volver al Dashboard</button>
      <h2>Gestión de Usuarios</h2>
      <hr />
      
      <form onSubmit={handleCreateUser} style={{ border: '1px solid #ccc', padding: '1.5em', borderRadius: '8px', marginBottom: '2em' }}>
        <h3>Añadir Nuevo Usuario</h3>
        <input type="text" placeholder="Nombre Completo" value={nombreCompleto} onChange={e => setNombreCompleto(e.target.value)} required />
        <input type="text" placeholder="Nombre de Usuario" value={username} onChange={e => setUsername(e.target.value)} required />
        <input type="password" placeholder="Contraseña Temporal" value={password} onChange={e => setPassword(e.target.value)} required />
        <select value={rol} onChange={e => setRol(e.target.value)}>
          <option value="Asesor">Asesor</option>
          <option value="Colaborador">Colaborador</option>
          <option value="Administrador">Administrador</option>
        </select>
        <button type="submit">Crear Usuario</button>
        {error && <p style={{ color: 'red', marginTop: '1em' }}>{error}</p>}
      </form>

      <h3>Usuarios Actuales</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Nombre Completo</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Nombre de Usuario</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Rol</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{user.nombreCompleto}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{user.username}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{user.rol}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                <button style={{ marginRight: '5px' }}>Editar Rol</button>
                <button>Cambiar Estado</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPage;