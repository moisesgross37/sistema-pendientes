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
  isActive: boolean; 
}

// --- Componente ---
function AdminPage({ token, setView }: AdminPageProps) {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Estado para mensajes de éxito

  // Estados para el formulario de creación
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [rol, setRol] = useState('Asesor');

  // Función para limpiar mensajes
  const clearMessages = () => {
    setError('');
    setSuccess('');
  }

  // Función para obtener la lista de usuarios
  const fetchUsers = async () => {
    clearMessages();
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
    clearMessages();
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
      setSuccess('Usuario creado con éxito.');
      fetchUsers(); // Recargamos la lista
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Función para editar Rol
  const handleEditRol = async (userId: number, currentRol: string) => {
    clearMessages();
    const nuevoRol = prompt(
      'Introduce el nuevo rol (Asesor, Colaborador, Administrador):',
      currentRol
    );

    if (!nuevoRol || nuevoRol === currentRol) {
      return;
    }

    try {
      const res = await fetch(`https://sistema-pendientes.onrender.com/usuarios/${userId}/rol`, {
        method: 'PATCH', 
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rol: nuevoRol })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'No se pudo actualizar el rol.');
      setSuccess('Rol actualizado con éxito.');
      fetchUsers(); 
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Función para cambiar Estado
  const handleChangeEstado = async (userId: number, currentStatus: boolean) => {
    clearMessages();
    const accion = currentStatus ? 'DESACTIVAR' : 'ACTIVAR';
    if (!confirm(`¿Estás seguro de que quieres ${accion} al usuario con ID ${userId}?`)) {
      return;
    }

    try {
      const res = await fetch(`https://sistema-pendientes.onrender.com/usuarios/${userId}/estado`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
         },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (!res.ok) throw new Error((await res.json()).message || 'No se pudo cambiar el estado.');
      setSuccess(`Usuario ${accion.toLowerCase()}do con éxito.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ================================================================
  // ===== 🚀 INICIO DE LAS NUEVAS FUNCIONES FRONTEND 🚀 =====
  // ================================================================

  /**
   * Maneja el reseteo de contraseña de un usuario
   */
  const handleResetPassword = async (userId: number, username: string) => {
    clearMessages();
    const nuevaClave = prompt(`Introduce la NUEVA contraseña para el usuario "${username}":`);

    if (!nuevaClave) {
      alert('Reseteo cancelado.');
      return;
    }

    if (nuevaClave.length < 4) {
      alert('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    try {
      const res = await fetch(`https://sistema-pendientes.onrender.com/usuarios/${userId}/password`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: nuevaClave })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo resetear la contraseña.');
      }
      
      setSuccess(`Contraseña de "${username}" actualizada con éxito.`);
      // No es necesario recargar la lista, solo mostrar éxito

    } catch (err: any) {
      setError(err.message);
    }
  };

  /**
   * Maneja la eliminación de un usuario
   */
  const handleDeleteUser = async (userId: number, username: string) => {
    clearMessages();
    
    // Doble confirmación para una acción destructiva
    const confirm1 = confirm(`¿Estás SEGURO de que quieres ELIMINAR al usuario "${username}"?\n\n¡Esta acción es irreversible!`);
    if (!confirm1) return;
    
    const confirm2 = confirm(`ÚLTIMA ADVERTENCIA:\n\nEliminar a "${username}". ¿Continuar?`);
    if (!confirm2) return;

    try {
      const res = await fetch(`https://sistema-pendientes.onrender.com/usuarios/${userId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
         }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'No se pudo eliminar al usuario.');
      }

      setSuccess(`Usuario "${username}" eliminado con éxito.`);
      fetchUsers(); // ¡Absolutamente necesario recargar la lista!

    } catch (err: any) {
      setError(err.message);
    }
  };

  // ================================================================
  // ===== 🚀 FIN DE LAS NUEVAS FUNCIONES FRONTEND 🚀 =====
  // ================================================================


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
      </form>
      
      {/* Mensajes de Estado */}
      {error && <p style={{ color: 'red', padding: '1em', backgroundColor: '#fdd' }}>Error: {error}</p>}
      {success && <p style={{ color: 'green', padding: '1em', backgroundColor: '#dfd' }}>Éxito: {success}</p>}

      <h3>Usuarios Actuales</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Nombre Completo</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Nombre de Usuario</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Rol</th>
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
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                <span style={{ color: user.isActive ? 'green' : 'red', fontWeight: 'bold' }}>
                  {user.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                <button 
                  style={{ marginRight: '5px' }}
                  onClick={() => handleEditRol(user.id, user.rol)}
                >
                  Editar Rol
                </button>
                <button
                  style={{ marginRight: '5px' }}
                  onClick={() => handleChangeEstado(user.id, user.isActive)}
                >
                  {user.isActive ? 'Desactivar' : 'Activar'}
                </button>

                {/* ==============================================
                  ===== 🚀 AQUÍ ESTÁN LOS NUEVOS BOTONES 🚀 =====
                  ==============================================
                */}
                <button
                  style={{ marginRight: '5px', backgroundColor: '#ffe0b3' }}
                  onClick={() => handleResetPassword(user.id, user.username)}
                >
                  Resetear Clave
                </button>
                <button
                  style={{ backgroundColor: '#ffcdd2', color: '#b71c1c' }}
                  onClick={() => handleDeleteUser(user.id, user.username)}
                >
                  Eliminar
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
