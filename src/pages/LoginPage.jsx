import { useState } from 'react';

function LoginPage({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (usuario && contrasena) {
      onLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
      {/* Card de Login */}
      <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full mx-4">
        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-800 text-center mb-8">
          Iniciar sesión
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Opción Microsoft */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <span className="text-2xl">🔵</span>
            <span className="text-gray-700 font-medium">Iniciar sesión con Microsoft</span>
          </button>

          {/* Divisor */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm">o</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Campo Usuario */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Usuario:
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ingrese su usuario"
            />
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Contraseña:
            </label>
            <input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ingrese su contraseña"
            />
          </div>

          {/* Botón Iniciar Sesión */}
          <button
            type="submit"
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-lg transition transform hover:scale-105 active:scale-95"
          >
            Iniciar sesión
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          ¿No tienes cuenta? <a href="#" className="text-teal-500 hover:underline">Regístrate aquí</a>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
