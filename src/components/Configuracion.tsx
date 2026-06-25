import React, { useState } from 'react';
import { Settings, User, Bell, Lock, Palette, Save, CheckCircle } from 'lucide-react';

export function Configuracion() {
  const [notificaciones, setNotificaciones] = useState({
    email: true,
    teams: true,
    nuevaSolicitud: true,
    aprobacion: true,
    rechazo: true,
    comentario: false,
  });

  const [perfil, setPerfil] = useState({
    nombre: 'Juan Díaz',
    email: 'juan.diaz@investinbogota.org',
    cargo: 'Solicitante',
    departamento: 'Operaciones',
    telefono: '+57 310 123 4567',
  });

  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  const handleGuardar = () => {
    setGuardadoExitoso(true);
    setTimeout(() => setGuardadoExitoso(false), 3000);
  };

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="text-[var(--brand-secondary)]" size={32} />
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Configuración</h1>
        </div>
        <p className="text-gray-600">Personaliza tu experiencia en la aplicación</p>
      </div>

      {/* Mensaje de Guardado Exitoso */}
      {guardadoExitoso && (
        <div className="mb-6 bg-green-50 border border-green-300 rounded-lg p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-700" size={24} />
            <p className="text-green-900 font-semibold">Cambios guardados exitosamente</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Menú Lateral */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sticky top-4">
            <nav className="space-y-2">
              <a
                href="#perfil"
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-[var(--brand-secondary)] font-medium"
              >
                <User size={20} />
                Perfil
              </a>
              <a
                href="#notificaciones"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Bell size={20} />
                Notificaciones
              </a>
              <a
                href="#seguridad"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Lock size={20} />
                Seguridad
              </a>
              <a
                href="#apariencia"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Palette size={20} />
                Apariencia
              </a>
            </nav>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="lg:col-span-2 space-y-8">
          {/* Perfil */}
          <div id="perfil" className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="text-[var(--brand-secondary)]" size={24} />
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Información de Perfil</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-[var(--brand-secondary)] flex items-center justify-center text-white text-2xl font-semibold">
                  JD
                </div>
                <div>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                    Cambiar Foto
                  </button>
                  <p className="text-xs text-gray-600 mt-1">JPG o PNG, máximo 2MB</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
                <input
                  type="text"
                  value={perfil.nombre}
                  onChange={(e) => setPerfil({ ...perfil, nombre: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  value={perfil.email}
                  onChange={(e) => setPerfil({ ...perfil, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cargo</label>
                  <input
                    type="text"
                    value={perfil.cargo}
                    onChange={(e) => setPerfil({ ...perfil, cargo: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Departamento</label>
                  <input
                    type="text"
                    value={perfil.departamento}
                    onChange={(e) => setPerfil({ ...perfil, departamento: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                <input
                  type="tel"
                  value={perfil.telefono}
                  onChange={(e) => setPerfil({ ...perfil, telefono: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Notificaciones */}
          <div id="notificaciones" className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="text-[var(--brand-secondary)]" size={24} />
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Preferencias de Notificaciones</h2>
            </div>

            <div className="space-y-4">
              <div className="pb-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Canales de Comunicación</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Correo Electrónico</p>
                      <p className="text-sm text-gray-600">Recibir notificaciones por email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificaciones.email}
                        onChange={(e) => setNotificaciones({ ...notificaciones, email: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-[var(--brand-secondary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-secondary)]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Microsoft Teams</p>
                      <p className="text-sm text-gray-600">Notificaciones en Teams</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificaciones.teams}
                        onChange={(e) => setNotificaciones({ ...notificaciones, teams: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-[var(--brand-secondary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-secondary)]"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Eventos a Notificar</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Nueva Solicitud</p>
                      <p className="text-sm text-gray-600">Cuando se crea una nueva solicitud</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificaciones.nuevaSolicitud}
                        onChange={(e) => setNotificaciones({ ...notificaciones, nuevaSolicitud: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-[var(--brand-secondary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-secondary)]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Aprobaciones</p>
                      <p className="text-sm text-gray-600">Cuando una solicitud es aprobada</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificaciones.aprobacion}
                        onChange={(e) => setNotificaciones({ ...notificaciones, aprobacion: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-[var(--brand-secondary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-secondary)]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Rechazos</p>
                      <p className="text-sm text-gray-600">Cuando una solicitud es rechazada</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificaciones.rechazo}
                        onChange={(e) => setNotificaciones({ ...notificaciones, rechazo: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-[var(--brand-secondary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-secondary)]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Comentarios</p>
                      <p className="text-sm text-gray-600">Cuando alguien comenta en una solicitud</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificaciones.comentario}
                        onChange={(e) => setNotificaciones({ ...notificaciones, comentario: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-[var(--brand-secondary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-secondary)]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seguridad */}
          <div id="seguridad" className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="text-[var(--brand-secondary)]" size={24} />
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Seguridad</h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Cambiar Contraseña</h3>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Contraseña actual"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent"
                  />
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent"
                  />
                  <input
                    type="password"
                    placeholder="Confirmar nueva contraseña"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Sesiones Activas</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Dispositivo Actual</p>
                      <p className="text-sm text-gray-600">Windows - Chrome • Bogotá, Colombia</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      Activo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Apariencia */}
          <div id="apariencia" className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="text-[var(--brand-secondary)]" size={24} />
              <h2 className="text-2xl font-black tracking-tight text-slate-900">Apariencia</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Tema de Color</label>
                <div className="grid grid-cols-3 gap-4">
                  <button className="p-4 border-2 border-[var(--brand-secondary)] bg-blue-50 rounded-lg">
                    <div className="w-full h-16 bg-[var(--brand-secondary)] rounded mb-2"></div>
                    <p className="text-sm font-medium text-gray-900">Invest in Bogotá</p>
                    <p className="text-xs text-gray-600">Por defecto</p>
                  </button>
                  <button className="p-4 border-2 border-gray-300 bg-white rounded-lg hover:border-gray-400">
                    <div className="w-full h-16 bg-gray-800 rounded mb-2"></div>
                    <p className="text-sm font-medium text-gray-900">Oscuro</p>
                    <p className="text-xs text-gray-600">Próximamente</p>
                  </button>
                  <button className="p-4 border-2 border-gray-300 bg-white rounded-lg hover:border-gray-400">
                    <div className="w-full h-16 bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-accent)] rounded mb-2"></div>
                    <p className="text-sm font-medium text-gray-900">Personalizado</p>
                    <p className="text-xs text-gray-600">Próximamente</p>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">Idioma</label>
                <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent">
                  <option>Español (Colombia)</option>
                  <option>English (United States)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Botón Guardar */}
          <div className="flex justify-end">
            <button
              onClick={handleGuardar}
              className="flex items-center gap-2 px-8 py-3 bg-[#E84922] text-white rounded-lg hover:bg-[#C73D1C] transition-colors font-medium shadow-md"
            >
              <Save size={20} />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
