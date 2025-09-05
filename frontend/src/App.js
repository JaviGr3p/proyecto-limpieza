import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Terminos from "./Terminos";
import TratamientoDatos from "./TratamientoDatos";
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserInfo();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      await fetchUserInfo();
      return true;
    } catch {
      return false;
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/auth/register`, userData);
      return await login(userData.email, userData.password);
    } catch {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setShowAuth(false);
  };

// WebSocket conexión
  const ws = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8000/ws");

    ws.current.onopen = () => {
      console.log("Conectado al WebSocket de FastAPI");
      setIsConnected(true);
      ws.current.send("Hola desde CleanPro frontend");
    };

    ws.current.onmessage = (event) => {
      console.log("Mensaje del backend FastAPI:", event.data);
      setMessages(prev => [...prev, event.data]);
    };

    ws.current.onclose = () => {
      console.log("WebSocket desconectado");
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error("Error WebSocket:", error);
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-alt">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setShowAuth }}>
    <div className="App">
      {/* Indicador de conexión WebSocket */}
      {/* <div className={`p-2 ${isConnected ? 'bg-green-100' : 'bg-red-100'}`}>
        WebSocket: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
      </div> */}
      <div className="hidden">
        {/* WebSocket: {isConnected ? 'Conectado' : 'Desconectado'} */}
      </div>
      {/* Mostrar mensajes del backend */}
      {/* <div className="p-4">
        <h3>Mensajes del backend:</h3>
        {messages.map((msg, idx) => (
          <div key={idx} className="bg-gray-100 p-2 m-1">{msg}</div>
        ))}
      </div> */}
      {/* Tu app principal */}
      {!user && !showAuth && <LandingPage />}
      {!user && showAuth && <AuthPages />}
      {user && <MainApp />}
    </div>
  </AuthContext.Provider>
  );
}

// Componentes de Landing Page
function LandingPage() {
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setShowAuth } = React.useContext(AuthContext);

  useEffect(() => {
    fetchLandingData();
  }, []);

  const fetchLandingData = async () => {
    try {
      const [servicesResponse, reviewsResponse] = await Promise.all([
        axios.get(`${API}/services`),
        axios.get(`${API}/reviews`)
      ]);
      setServices(servicesResponse.data);
      setReviews(reviewsResponse.data);
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-alt">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

// Navegación y Hero Section
  return (
    <div className="min-h-screen bg-main">
      {/* Navegación */}
      <nav className="bg-main shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">CleanPro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAuth(true)}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Ingresar
              </button>
              <button
                onClick={() => setShowAuth(true)}
                className="bg-btn text-white px-4 py-2 rounded-md hover:bg-btn-hover text-sm font-medium"
              >
                Empieza Ahora 
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                Servicios de limpieza profesional
                <span className="block text-blue-200">Así de fácil.</span>
              </h1>
              <p className="text-xl mb-8 text-blue-100">
                Reserve profesionales de limpieza de confianza para su hogar u oficina.
                Programación fácil, pagos seguros y satisfacción garantizada.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-main text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
                >
                  Reserva Ahora
                </button>
                <button
                  onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}
                  className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-main hover:text-blue-600 transition-colors text-lg"
                >
                  Ver Servicios
                </button>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1617537230936-bb8c9327e84f" 
                alt="Limpieza profesional"
                className="rounded-2xl shadow-2xl w-full h-96 object-cover"
              />
              <div className="absolute -bottom-6 -left-6 bg-main rounded-xl p-6 shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 rounded-full p-2">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold">100% Satisfacción</p>
                    <p className="text-gray-600 text-sm">Calidad garantizada</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

<Router>
  <div>
    {/* agregar layout, opcional */}
  </div>
    <Routes>
      {/* ...rutas legales... */}
      <Route path="/terminos" element={<Terminos />} />
      <Route path="/tratamiento-datos" element={<TratamientoDatos />} />
    </Routes>
  </Router>
  
      {/* Sección de servicios */}
      <section id="services" className="py-20 bg-alt">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              ¿Qué esperas para contratar nuestros servicios?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Servicios de limpieza profesionales adaptados a sus necesidades. Todo nuestro personal está capacitado, 
              asegurado y cuenta con verificación de antecedentes para su tranquilidad.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div key={service.id} className="bg-main rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="relative">
                  <img 
                    src={service.image_url} 
                    alt={service.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-btn text-white px-3 py-1 rounded-full text-sm font-medium">
                    {Math.floor(service.estimated_duration / 60)}h {service.estimated_duration % 60}m
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{service.name}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-2xl font-bold text-blue-600">
                        {service.hourly_rate.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })} COP
                    </span>
                      <span className="text-gray-500 text-sm">/hora</span>
                    </div>
                    <button
                      onClick={() => setShowAuth(true)}
                      className="bg-btn text-white px-6 py-2 rounded-lg hover:bg-btn-hover transition-colors font-medium"
                    >
                      Reserva Ahora
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección de características */}
      <section className="py-20 bg-main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Hacemos que los servicios de limpieza profesionales sean accesibles, confiables y asequibles para todos.
            </p>
          </div>
          {/* ...features grid ... */}
        </div>
      </section>

      {/* Sección de testimonios */}
      {reviews.length > 0 && (
        <section className="py-20 bg-alt">
          {/* ...grid de testimonios... */}
        </section>
      )}

      {/* Sección de CTA */}
      <section className="py-20 bg-btn">
        {/* ...cta igual... */}
      </section>

      {/* Footer */}
      <footer className="bg-main border-t border-alt mt-16">
  <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
    <div className="text-secondary text-sm">
      © {new Date().getFullYear()} CleanPro. Todos los derechos reservados.
    </div>
    <div className="flex space-x-6">
      <a href="/terminos" className="text-primary hover:underline text-sm">Términos y Condiciones</a>
      <a href="/tratamiento-datos" className="text-primary hover:underline text-sm">Tratamiento de Datos</a>
    </div>
  </div>
</footer>
    </div>
  );
}

// Authentication pages
function AuthPages() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register, setShowAuth } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = isLogin 
      ? await login(formData.email, formData.password)
      : await register(formData);

    if (!success) {
      setError(isLogin ? 'Invalid credentials' : 'Registration failed');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-main rounded-2xl shadow-xl">
        <div className="text-center">
          <button
            onClick={() => setShowAuth(false)}
            className="text-gray-400 hover:text-gray-600 float-right"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Bienvenido nuevamente' : 'Cree su cuenta'}
          </h2>
          <p className="text-gray-600">
            {isLogin ? 'Inicia sesion en tu cuenta' : 'Unete a nuestra plataforma de servicios de limpieza'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de teléfono "Sin indicativo"
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingresa email válido
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asigna una clave
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-btn text-white py-2 px-4 rounded-lg hover:bg-btn-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {isLogin ? '¿Necesitas una cuenta? Registrate' : '¿Ya tiene cuenta? Inicie sesion'}
          </button>
        </div>
      </div>
    </div>
  );
}
// Main application (same as before)
function MainApp() {
  const [currentPage, setCurrentPage] = useState('home');
  const { user, logout } = React.useContext(AuthContext);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'services':
        return <ServicesPage />;
      case 'bookings':
        return <BookingsPage />;
      case 'admin':
        return user.role === 'admin' ? <AdminPanel /> : <HomePage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-alt">
      <nav className="bg-main shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">CleanPro</h1>
            </div>
            <div className="flex items-center space-x-8">
              <button
                onClick={() => setCurrentPage('home')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 'home' ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Inicio
              </button>
              <button
                onClick={() => setCurrentPage('services')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 'services' ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Servicios
              </button>
              <button
                onClick={() => setCurrentPage('bookings')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === 'bookings' ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Mis reservas
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => setCurrentPage('admin')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === 'admin' ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  Cpanel
                </button>
              )}
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">Hola, {user.full_name}</span>
                <button
                  onClick={logout}
                  className="bg-btn text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderPage()}
      </main>
    </div>
  );
}

// Componente de página de inicio 
function HomePage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="relative px-8 py-16 text-center">
          <img 
            src="https://images.unsplash.com/photo-1617537230936-bb8c9327e84f" 
            alt="Limpieza profesional"
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
          />
          <div className="relative z-10">
            <h1 className="text-5xl font-bold mb-4">Servicios de limpieza profesional</h1>
            <p className="text-xl mb-8">Reserva profesionales de limpieza de confianza para tu hogar u oficina</p>
            <button className="bg-main text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Reserva Ahora
            </button>
          </div>
        </div>
      </section>

      {/* Preview de servicios */}
      <section>
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Contrata nuestros servicios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-main rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <img 
                src={service.image_url} 
                alt={service.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {service.hourly_rate.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                  </span>
                  <span className="text-sm text-gray-500">{service.estimated_duration} min</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sección de características */}
      <section className="bg-main rounded-2xl p-8 shadow-lg">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">¿Por qué elegirnos?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Profesionales de confianza</h3>
            <p className="text-gray-600">Todos nuestros limpiadores son profesionales capacitados y con antecedentes verificados.</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Horario Flexible</h3>
            <p className="text-gray-600">Reserve citas que se ajusten a su horario, los 7 días de la semana.</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Pagos seguros</h3>
            <p className="text-gray-600">Procesamiento de pagos seguro y protegido</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Componente de página de servicios 
function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-gray-900 text-center">¿Qué esperas para contratar nuestros servicios?</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service.id} className="bg-main rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <img 
              src={service.image_url} 
              alt={service.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h3>
              <p className="text-gray-600 mb-4">{service.description}</p>
              <div className="flex justify-between items-center mb-4">
                <span className="text-2xl font-bold text-blue-600">${service.hourly_rate.toLocaleString('es-CO', { minimumFractionDigits: 0 })} COP /hora</span>
                <span className="text-sm text-gray-500">{service.estimated_duration} min</span>
              </div>
              <button
                onClick={() => setSelectedService(service)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white py-2 px-4 rounded-lg shadow hover:scale-105 transition-transform font-semibold"
              >
                Reservar
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedService && (
        <BookingModal 
          service={selectedService} 
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
}

// Componente modal de reserva
function BookingModal({ service, onClose }) {
  const [formData, setFormData] = useState({
    booking_date: '',
    start_time: '',
    end_time: '',
    total_hours: 0,
    address: '',
    special_instructions: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Calcular el total de horas si se proporcionan las horas de inicio y finalización
      if (name === 'start_time' || name === 'end_time') {
        if (updated.start_time && updated.end_time) {
          const start = new Date(`2000-01-01T${updated.start_time}`);
          const end = new Date(`2000-01-01T${updated.end_time}`);
          const diffHours = (end - start) / (1000 * 60 * 60);
          updated.total_hours = Math.max(0, diffHours);
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bookingData = {
        ...formData,
        service_id: service.id,
        booking_date: new Date(formData.booking_date).toISOString()
      };

      const response = await axios.post(`${API}/bookings`, bookingData);
      
      if (response.data) {
        // Crear sesión de pago
        const origin = window.location.origin;
        const paymentResponse = await axios.post(`${API}/payments/create-checkout-session`, {
          booking_id: response.data.id,
          origin_url: origin
        });

        if (paymentResponse.data.url) {
          window.location.href = paymentResponse.data.url;
        }
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = formData.total_hours * service.hourly_rate;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-main rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Reservar {service.name}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de reserva
            </label>
            <input
              type="date"
              name="booking_date"
              value={formData.booking_date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de inicio
              </label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de finalización
              </label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instrucciones Especiales (Opcional)
            </label>
            <textarea
              name="special_instructions"
              value={formData.special_instructions}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {formData.total_hours > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Duration: {formData.total_hours} hours</span>
                <span className="text-lg font-bold text-blue-600">
                  Total: ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || formData.total_hours <= 0}
            className="w-full bg-btn text-white py-3 px-4 rounded-lg hover:bg-btn-hover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing...' : 'Book & Pay'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Componente de página de reservas
function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

const deleteBooking = async (bookingId) => {
  if (!window.confirm('¿Estás seguro de eliminar esta reserva?')) return;
  try {
    await axios.delete(`${API}/bookings/${bookingId}`);
    setBookings(prev => prev.filter(b => b.id !== bookingId));
  } catch (error) {
    alert('Error eliminando la reserva');
  }
};

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-gray-900 text-center">Mis Reservas</h1>
      
      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No se encontraron reservas. ¡Reserva tu primer servicio!</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-main rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Booking #{booking.id.slice(-8)}
                  </h3>
                  <div className="space-y-1 text-gray-600">
                    <p><strong>Date:</strong> {new Date(booking.booking_date).toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {booking.start_time} - {booking.end_time}</p>
                    <p><strong>Duration:</strong> {booking.total_hours} hours</p>
                    <p><strong>Address:</strong> {booking.address}</p>
                    <p><strong>Total Amount:</strong> ${booking.total_amount.toFixed(2)}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                  {booking.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              
              {booking.special_instructions && (
                <div className="mt-4 p-3 bg-alt rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Special Instructions:</strong> {booking.special_instructions}
                  </p>
                </div>
              )}
              {/* Botón eliminar */}
            <div className="flex justify-end mt-2">
              <button
                onClick={() => deleteBooking(booking.id)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Componentes panel de administración

function AdminPanel() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const loggedUser = React.useContext(AuthContext).user;
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState(null);
  const [newService, setNewService] = useState({
  name: '',
  description: '',
  hourly_rate: '',
  estimated_duration: '',
  image_url: ''
});

const createService = async () => {
  try {
    await axios.post(`${API}/services`, {
      ...newService,
      hourly_rate: parseFloat(newService.hourly_rate),
      estimated_duration: parseInt(newService.estimated_duration)
    });
    setNewService({ name: '', description: '', hourly_rate: '', estimated_duration: '', image_url: '' });
    fetchAdminData();
  } catch (error) {
    alert('Error creating service');
  }
};

const updateService = async () => {
  try {
    await axios.put(`${API}/services/${editingService.id}`, {
      ...editingService,
      hourly_rate: parseFloat(editingService.hourly_rate),
      estimated_duration: parseInt(editingService.estimated_duration)
    });
    setEditingService(null);
    fetchAdminData();
  } catch (error) {
    alert('Error updating service');
  }
};

const deleteService = async (id) => {
  if (!window.confirm('Are you sure you want to delete this service?')) return;
  try {
    await axios.delete(`${API}/services/${id}`);
    fetchAdminData();
  } catch (error) {
    alert('Error deleting service');
  }
};
  useEffect(() => {
    fetchAdminData();
  }, [currentTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (currentTab === 'dashboard') {
        const response = await axios.get(`${API}/admin/dashboard`);
        setDashboardData(response.data);
      } else if (currentTab === 'services') {
        const response = await axios.get(`${API}/services`);
        setServices(response.data);
      } else if (currentTab === 'bookings') {
        const response = await axios.get(`${API}/admin/bookings`);
        setBookings(response.data);
      } else if (currentTab === 'users') {
        const response = await axios.get(`${API}/admin/users`);
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };
  
const updateUserRole = async (userId, role) => {
  try {
    await axios.put(`${API}/admin/users/${userId}/role`, null, { params: { role } });
    fetchAdminData();
  } catch (error) {
    alert('Error updating user role');
  }
};

const deleteUser = async (userId) => {
  if (!window.confirm('Are you sure you want to delete this user?')) return;
  try {
    await axios.delete(`${API}/admin/users/${userId}`);
    fetchAdminData();
  } catch (error) {
    alert('Error deleting user');
  }
};

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/status`, { status });
      fetchAdminData();
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-main rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Bookings</h3>
          <p className="text-3xl font-bold text-blue-600">{dashboardData.total_bookings || 0}</p>
        </div>
        <div className="bg-main rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-green-600">{dashboardData.total_users || 0}</p>
        </div>
        <div className="bg-main rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-purple-600">${dashboardData.total_revenue || 0}</p>
        </div>
        <div className="bg-main rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending Bookings</h3>
          <p className="text-3xl font-bold text-yellow-600">{dashboardData.pending_bookings || 0}</p>
        </div>
      </div>
    </div>
  );

  const adminDeleteBooking = async (bookingId) => {
  if (!window.confirm('¿Estás seguro de eliminar esta reserva?')) return;
  try {
    await axios.delete(`${API}/admin/bookings/${bookingId}`);
    setBookings(prev => prev.filter(b => b.id !== bookingId));
  } catch (error) {
    alert('Error eliminando la reserva');
  }
};

  const renderBookings = () => (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div key={booking.id} className="bg-main rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Booking #{booking.id.slice(-8)}
              </h3>
              <div className="space-y-1 text-gray-600">
                <p><strong>Date:</strong> {new Date(booking.booking_date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {booking.start_time} - {booking.end_time}</p>
                <p><strong>Amount:</strong> ${booking.total_amount.toFixed(2)}</p>
                <p><strong>Address:</strong> {booking.address}</p>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                {booking.status.replace('_', ' ').toUpperCase()}
              </span>
              <select
                value={booking.status}
                onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                className="px-3 py-1 border border-primary rounded-lg text-sm"
              >
                <option value="pending">Pendiente</option>
                <option value="confirmed">Confirmado</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
              <button
                onClick={() => adminDeleteBooking(booking.id)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors mt-2"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-primary text-center">Admin Panel</h1>
      
      <div className="bg-main rounded-xl shadow-lg p-6">
        <div className="flex space-x-6 mb-6">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium ${
              currentTab === 'dashboard' ? 'bg-btn text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Tablero
          </button>
          <button
            onClick={() => setCurrentTab('bookings')}
            className={`px-4 py-2 rounded-lg font-medium ${
              currentTab === 'bookings' ? 'bg-btn text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Reservas
          </button>
          <button
            onClick={() => setCurrentTab('services')}
            className={`px-4 py-2 rounded-lg font-medium ${
              currentTab === 'services' ? 'bg-btn text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Servicios
          </button>
          <button
            onClick={() => setCurrentTab('users')}
            className={`px-4 py-2 rounded-lg font-medium ${
              currentTab === 'users' ? 'bg-btn text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Usuarios
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div>
            {currentTab === 'dashboard' && renderDashboard()}
            {currentTab === 'bookings' && renderBookings()}
            {currentTab === 'services' && (
  <div>
    <h2 className="text-2xl font-bold mb-4">Administrar Servicios</h2>
    {/* Crear nuevo servicio */}
    <div className="mb-8">
      <h3 className="font-semibold mb-2">Agregar Nuevo Servicio</h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
        <input type="text" placeholder="Name" value={newService?.name || ''} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))} className="border p-2 rounded" />
        <input type="text" placeholder="Description" value={newService?.description || ''} onChange={e => setNewService(s => ({ ...s, description: e.target.value }))} className="border p-2 rounded" />
        <input type="number" placeholder="Hourly Rate" value={newService?.hourly_rate || ''} onChange={e => setNewService(s => ({ ...s, hourly_rate: e.target.value }))} className="border p-2 rounded" />
        <input type="number" placeholder="Duration (min)" value={newService?.estimated_duration || ''} onChange={e => setNewService(s => ({ ...s, estimated_duration: e.target.value }))} className="border p-2 rounded" />
        <input type="text" placeholder="Image URL" value={newService?.image_url || ''} onChange={e => setNewService(s => ({ ...s, image_url: e.target.value }))} className="border p-2 rounded" />
      </div>
      <button onClick={createService} className="bg-btn text-white px-4 py-2 rounded">Agregar Servicio</button>
    </div>
    {/* Listar y editar servicios */}
    <table className="min-w-full bg-main rounded shadow">
      <thead>
        <tr>
          <th className="p-2">Nombre</th>
          <th className="p-2">Descripción</th>
          <th className="p-2">Tarifa</th>
          <th className="p-2">Duración</th>
          <th className="p-2">Imagen</th>
          <th className="p-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {services.map(service => (
          <tr key={service.id}>
            {editingService && editingService.id === service.id ? (
              <>
                <td><input value={editingService.name} onChange={e => setEditingService(s => ({ ...s, name: e.target.value }))} className="border p-1 rounded" /></td>
                <td><input value={editingService.description} onChange={e => setEditingService(s => ({ ...s, description: e.target.value }))} className="border p-1 rounded" /></td>
                <td><input type="number" value={editingService.hourly_rate} onChange={e => setEditingService(s => ({ ...s, hourly_rate: e.target.value }))} className="border p-1 rounded" /></td>
                <td><input type="number" value={editingService.estimated_duration} onChange={e => setEditingService(s => ({ ...s, estimated_duration: e.target.value }))} className="border p-1 rounded" /></td>
                <td><input value={editingService.image_url} onChange={e => setEditingService(s => ({ ...s, image_url: e.target.value }))} className="border p-1 rounded" /></td>
                <td>
                  <button onClick={updateService} className="bg-btn text-white px-4 py-2 rounded hover:bg-btn-hover transition-colors">Guardar</button>
                  <button onClick={() => setEditingService(null)} className="bg-gray-400 text-white px-2 py-1 rounded">Cancelar</button>
                </td>
              </>
            ) : (
              <>
                <td>{service.name}</td>
                <td>{service.description}</td>
                <td>{service.hourly_rate.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                <td>{service.estimated_duration} min</td>
                <td><img src={service.image_url} alt="" className="w-16 h-10 object-cover" /></td>
                <td>
                  <button onClick={() => setEditingService(service)} className="bg-btn text-white px-4 py-2 rounded hover:bg-btn-hover transition-colors">Editar</button>
                  <button onClick={() => deleteService(service.id)} className="bg-btn text-white px-2 py-1 rounded">Eliminar</button>
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
            {currentTab === 'users' && (
  <div>
    <h2 className="text-2xl font-bold mb-4 text-primary">Manage Users</h2>
    <table className="min-w-full bg-main rounded shadow">
      <thead>
        <tr>
          <th className="p-2 text-primary">Nombre</th>
          <th className="p-2 text-primary">Email</th>
          <th className="p-2 text-primary">Telefono</th>
          <th className="p-2 text-primary">Rol</th>
          <th className="p-2 text-primary">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {users.map(user => (
          <tr key={user.id} className="even:bg-alt">
            <td className="text-secondary">{user.full_name}</td>
            <td className="text-secondary">{user.email}</td>
            <td className="text-secondary">{user.phone}</td>
            <td>
              <select
                value={user.role}
                onChange={e => updateUserRole(user.id, e.target.value)}
                className="border border-primary p-1 rounded text-primary"
                disabled={loggedUser.id === user.id || loggedUser.role !== "admin" || user.email === "admin@cleaningservice.com"}
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
            </td>
            <td>
              {user.email !== "admin@cleaningservice.com" && (
                <button
                  onClick={() => deleteUser(user.id)}
                  className="bg-btn text-white px-2 py-1 rounded hover:bg-btn-hover transition-colors"
                >
                  Delete
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
          </div>
        )}
      </div>
    </div>
  );
}


export default App;