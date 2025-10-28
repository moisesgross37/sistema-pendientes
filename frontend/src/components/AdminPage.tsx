import { useState, useEffect } from 'react';

// --- Interfaces ---
interface AdminPageProps {
  token: string;
  setView: (view: 'login' | 'dashboard' | 'admin') => void;
}

interface Usuario {
  id: number;
  username: string;
  nombreCompleto: string;
  rol: string;
  // Añadimos el estado, ya que probablemente lo necesitemos
  isActive: boolean; 
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
  }, [token]); // El array de dependencias es correcto si 'token' es estable

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

  // ================================================================
  // ===== 🚀 INICIO DE LAS NUEVAS FUNCIONES AÑADIDAS 🚀 =====
  // ================================================================

  /**
   * Maneja la edición del rol de un usuario
   */
  const handleEditRol = async (userId: number, currentRol: string) => {
    // 1. Pedir el nuevo rol (puedes cambiar esto por un <select> en un modal)
    const nuevoRol = prompt(
      'Introduce el nuevo rol (Asesor, Colaborador, Administrador):',
      currentRol
    );

    // Si el usuario cancela o no pone nada, no hacemos nada
    if (!nuevoRol || nuevoRol === currentRol) {
      console.log('Edición de rol cancelada.');
      return;
    }

    console.log(`Intentando cambiar rol del usuario ${userId} a ${nuevoRol}`);
    setError(''); // Limpiar errores

    try {
      // !! AVISO: Esta URL es un SUPUESTO. Necesito ver tu 'usuarios.controller.ts'
      const res = await fetch(`https://sistema-pendientes.onrender.com/usuarios/${userId}/rol`, {
        method: 'PATCH', // Usamos PATCH para actualizaciones parciales
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rol: nuevoRol })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo actualizar el rol.');
      }
      
      // Éxito: recargamos la lista de usuarios para ver el cambio
      fetchUsers(); 

    } catch (err: any) {
      setError(err.message);
    }
  };

  /**
   * Maneja el cambio de estado (activar/desactivar) de un usuario
   */
  const handleChangeEstado = async (userId: number, currentStatus: boolean) => {
    // 1. Confirmar la acción
    const accion = currentStatus ? 'DESACTIVAR' : 'ACTIVAR';
    const confirmar = confirm(`¿Estás seguro de que quieres ${accion} al usuario con ID ${userId}?`);

    if (!confirmar) {
      console.log('Cambio de estado cancelado.');
      return;
    }

    console.log(`Intentando ${accion} al usuario ${userId}`);
    setError(''); // Limpiar errores

    try {
      // !! AVISO: Esta URL también es un SUPUESTO.
      // Podría ser /usuarios/:id/estado, /usuarios/:id/activar, etc.
      const res = await fetch(`https://sistema-pendientes.onrender.com/usuarios/${userId}/estado`, {
        method: 'PATCH', // Usamos PATCH
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
         },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo cambiar el estado.');
      }

      // Éxito: recargamos la lista
      fetchUsers();

    } catch (err: any) {
      setError(err.message);
    }
  };

  // ================================================================
  // ===== 🚀 FIN DE LAS NUEVAS FUNCIONES AÑADIDAS 🚀 =====
  // ================================================================


  return (
    <div>
      <button onClick={() => setView('dashboard')} style={{ marginBottom: '1em' }}>&larr; Volver al Dashboard</button>
      <h2>Gestión de Usuarios</h2>
      <hr />
      
      <form onSubmit={handleCreateUser} style={{ border: '1px solid #ccc', padding: '1.5em', borderRadius: '8px', marginBottom: '2em' }}>
        {/* ... (tu formulario de crear usuario sigue igual) ... */}
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
            {/* Añadí una columna de Estado para que 'Cambiar Estado' tenga sentido */}
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Estado</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{user.nombreCompleto}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{user.username}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{user.rol}</td>
              {/* Mostramos el estado actual */}
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                {user.isActive ? 'Activo' : 'Inactivo'}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                {/* ====================================================
                  ===== 🚀 AQUÍ ESTÁ LA CORRECCIÓN DE LOS BOTONES 🚀 =====
                  ====================================================
                  Usamos una función de flecha () => ... para pasar el ID
                  del usuario a nuestras nuevas funciones.
                */}
                <button 
                  style={{ marginRight: '5px' }}
                  onClick={() => handleEditRol(user.id, user.rol)}
                >
                  Editar Rol
                </button>
                <button
                  onClick={() => handleChangeEstado(user.id, user.isActive)}
                >
                  {/* El texto del botón cambia según el estado */}
                  {user.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPage;
