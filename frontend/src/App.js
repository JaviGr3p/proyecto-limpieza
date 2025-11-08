import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from "react-router-dom";
import Terminos from "./Terminos";
import TratamientoDatos from "./TratamientoDatos";
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';
import axios from 'axios';
import CalidadSoftware from "./pages/CalidadSoftware";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://192.169.100.22:8000';
const API = '/api';

const AuthContext = React.createContext();

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [employeeAssignments, setEmployeeAssignments] = useState([]);
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

    // LOGIN
    const login = async (email, password) => {
    try {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);
        
        const response = await axios.post(`${API}/auth/login`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        await fetchUserInfo();
        return true;
    } catch (error) {
        console.error('Login error:', error.response?.data || error.message);
        return false;
    }
};

  const register = async (userData) => {
        try {
            await axios.post(`${API}/auth/register`, userData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await login(userData.email, userData.password);
        } catch (error) {
            console.error('Register error:', error.response?.data || error.message);
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setShowAuth(false);
    };

    const [wsConnected, setWsConnected] = useState(false);
    const wsHandlers = {
        connection: (isConnected) => setWsConnected(isConnected),
        notification: (data) => {
            console.log('Nueva notificación:', data);
        }
    };
    
    useWebSocket(user?.id, user?.role, wsHandlers);

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
    const { setShowAuth } = useContext(AuthContext);

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
                    <Route path="/calidad" element={<CalidadSoftware />} />
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
                        <a href="/Calidad" className="text-primary hover:underline text-sm">Calidad del Software</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

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
    const { login, register, setShowAuth } = useContext(AuthContext);

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
                            className="w-full px-3 py-2 tratamientoborder border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        {loading ? 'Procesando...' : (isLogin ? 'Sign In' : 'Crear Cuenta')}
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

// Main application
function MainApp() {
    const [currentPage, setCurrentPage] = useState('home');
    const { user, logout } = useContext(AuthContext);

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
            case 'employee':
                return user.role === 'employee' ? <EmployeePanel /> : <HomePage />;
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
                            {user.role === 'employee' && (
                                <button
                                    onClick={() => setCurrentPage('employee')}
                                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                                        currentPage === 'employee' ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                                    }`}
                                >
                                    Mis Asignaciones
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
                            <img src={service.image_url} alt={service.name} className="w-full h-48 object-cover" />
                            <div className="p-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h3>
                                <p className="text-gray-600 mb-4">{service.description}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-2xl font-bold text-blue-600">${service.hourly_rate.toLocaleString('es-CO', { minimumFractionDigits: 0 })} COP /hora</span>
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3z" />
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
                        <img src={service.image_url} alt={service.name} className="w-full h-48 object-cover" />
                        <div className="p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h3>
                            <p className="text-gray-600 mb-4">{service.description}</p>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-2xl font-bold text-blue-600">${service.hourly_rate.toLocaleString('es-CO', { minimumFractionDigits: 0 })} COP /hora</span>
                                <span className="text-sm text-gray-500">{service.estimated_duration} min</span>
                            </div>
                            <button onClick={() => setSelectedService(service)} className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white py-2 px-4 rounded-lg shadow hover:scale-105 transition-transform font-semibold" >
                                Reservar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {selectedService && (
                <BookingModal service={selectedService} onClose={() => setSelectedService(null)} />
            )}
        </div>
    );
}

// Componente de página de reservas del cliente
function BookingsPage() {
    const { user } = useContext(AuthContext); 
    const [bookings, setBookings] = useState([]);
    const [employeeAssignments, setEmployeeAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const translateBookingStatus = (status) => {
        const statusMap = {
            'pending': 'Pendiente',
            'confirmed': 'Confirmada', 
            'completed': 'Completada',
            'cancelled': 'Cancelada'
        };
        return statusMap[status] || status;
    };
    
    useEffect(() => {
        fetchBookings();
    }, []);

const fetchEmployeeAssignments = async () => {
        if (user?.role !== 'employee') return;
        
        try {
            setLoading(true);
            const response = await axios.get(`${API}/employee/assignments/${user.id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setEmployeeAssignments(response.data);
        } catch (error) {
            console.error('Error fetching employee assignments:', error);
        } finally {
            setLoading(false);
        }
    };

       useEffect(() => {
        if (user?.role === 'employee') {
            fetchEmployeeAssignments();
        }
    }, [user]);

    const fetchBookings = async () => {
    try {
        const response = await axios.get(`${API}/bookings/user`);
        setBookings(response.data);
    } catch (error) {
        console.error('Error fetching bookings:', error);
    } finally {
        setLoading(false);
    }
};
    const handleShowDetails = (booking) => {
        setSelectedBooking(booking);
        setShowModal(true);
    };

    const handleContactWhatsApp = (phone, bookingId) => {
        const message = encodeURIComponent(`Hola! Me comunico por la reserva #${bookingId}. ¿Podrías confirmarme los detalles del servicio?`);
        window.open(`https://wa.me/57${phone}?text=${message}`, '_blank');
    };

    const handleCall = (phone) => {
        window.open(`tel:+57${phone}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 text-center">Mis Reservas</h1>
            {bookings.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 9l6-6m0 0v6m0-6H6" />
                    </svg>
                    <p className="text-xl">No tienes reservas aún</p>
                    <p className="text-gray-400">¡Haz tu primera reserva en la sección de servicios!</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                <table className="min-w-full bg-main rounded-lg shadow-lg">
                    <thead className="bg-blue-600 text-white">
                        <tr>
                            <th className="p-3 text-left">Servicio</th>
                            <th className="p-3 text-left">Fecha y Hora</th>
                            <th className="p-3 text-left">Estado</th>
                            <th className="p-3 text-left">Asignado a</th>
                            <th className="p-3 text-left">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
    {bookings.map((booking) => (
        <tr key={booking.id} className="border-b last:border-b-0 hover:bg-blue-50">
            {/* COLUMNA SERVICIO - CORREGIDA */}
            <td className="p-3">
                <div>
                    <div className="font-semibold text-gray-900">{booking.service_name}</div>
                    <div className="text-sm text-gray-600">
                        {booking.hourly_rate ?
                            `$${booking.hourly_rate.toLocaleString('es-CO')} COP/hora`
                            : 'Precio no disponible'
                        }
                    </div>
                </div>
            </td>
            
            {/* COLUMNA FECHA Y HORA */}
            <td className="p-3">
                <div>
                    <div className="font-medium text-gray-900">{new Date(booking.booking_date).toLocaleDateString('es-CO')}</div>
                    <div className="text-sm text-gray-600">{booking.start_time} - {booking.end_time}</div>
                </div>
            </td>
            
            {/* COLUMNA ESTADO */}
            <td className="p-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    booking.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                    booking.status === 'confirmed' ? 'bg-green-200 text-green-800' :
                    booking.status === 'completed' ? 'bg-blue-200 text-blue-800' :
                    'bg-gray-200 text-gray-800'
                }`}>
                    {translateBookingStatus(booking.status)}
                </span>
            </td>
            
            {/* COLUMNA ASIGNADO A - CORREGIDA */}
            <td className="p-3">
                {booking.employee_full_name ? (
                    <div>
                        <div className="font-medium text-gray-900">{booking.employee_full_name}</div>
                        {booking.employee_phone && (
                            <div className="flex space-x-2 mt-1">
                                <button
                                onClick={() => handleContactWhatsApp(booking.employee_phone, booking.id)}
                                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                                >
                                WhatsApp
                                </button>
                                <button
                                    onClick={() => handleCall(booking.employee_phone)}
                                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                                >
                                    Llamar
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-gray-500 italic">No asignado</span>
                )}
            </td>
            
            {/* COLUMNA ACCIONES */}
            <td className="p-3">
                <button
                    onClick={() => handleShowDetails(booking)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors text-sm"
                >
                    Detalles
                </button>
            </td>
        </tr>
    ))}
</tbody>
                </table>
            </div>
        )}

            {/* Modal de detalles */}
            {showModal && selectedBooking && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-main rounded-xl p-6 max-w-lg w-full space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">Detalles de la Reserva</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="font-semibold text-gray-700">Servicio:</label>
                                <p className="text-gray-600">{selectedBooking.service_name}</p>
                            </div>
                             <div>
                            <label className="font-semibold text-gray-700">Descripción:</label>
                                <p className="text-gray-600">{selectedBooking.service_description || 'Sin descripción disponible'}</p>
                            </div>
                            <div>
                                <label className="font-semibold text-gray-700">Fecha:</label>
                                <p className="text-gray-600">{new Date(selectedBooking.booking_date).toLocaleDateString('es-CO')}</p>
                            </div>
                            <div>
                                <label className="font-semibold text-gray-700">Horario:</label>
                                <p className="text-gray-600">{selectedBooking.start_time} - {selectedBooking.end_time} ({selectedBooking.total_hours} horas)</p>
                            </div>
                            <div>
                                <label className="font-semibold text-gray-700">Dirección:</label>
                                <p className="text-gray-600">{selectedBooking.address}</p>
                            </div>
                            {selectedBooking.special_instructions && (
                                <div>
                                    <label className="font-semibold text-gray-700">Instrucciones especiales:</label>
                                    <p className="text-gray-600">{selectedBooking.special_instructions}</p>
                                </div>
                            )}
                            {selectedBooking.employee_full_name && (
                                <div>
                                    <label className="font-semibold text-gray-700">Empleado asignado:</label>
                                    <p className="text-gray-600">{selectedBooking.employee_full_name}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
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
            const origin = window.location.origin;
            const paymentResponse = await axios.post(`${API}/payments/create-checkout-session`, {
                booking_id: response.data.id,
                origin_url: origin
            });
                       
            if (paymentResponse.data && paymentResponse.data.url) {
                window.location.href = paymentResponse.data.url;
            }
        }

    } catch (error) {
        console.error('Booking or payment error:', error);
        alert('Error al procesar la reserva. Por favor, intente de nuevo.');
    } finally {
        setLoading(false);
     }
};
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-main rounded-xl p-6 max-w-lg w-full space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Reservar: {service.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
                            required
                            className="w-full px-3 py-2 border border-primary rounded-lg"
                        />
                    </div>
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
                            className="w-full px-3 py-2 border border-primary rounded-lg"
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
                            className="w-full px-3 py-2 border border-primary rounded-lg"
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700">
                            Horas estimadas: <span className="font-bold">{formData.total_hours}</span>
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Dirección de servicio
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-primary rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Instrucciones especiales (opcional)
                        </label>
                        <textarea
                            name="special_instructions"
                            value={formData.special_instructions}
                            onChange={handleChange}
                            rows="3"
                            className="w-full px-3 py-2 border border-primary rounded-lg"
                        ></textarea>
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Procesando...' : 'Reservar y pagar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Componente para el panel de administrador
function AdminPanel() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [dashboardData, setDashboardData] = useState({
        totalBookings: 0,
        totalUsers: 0,
        totalRevenue: 0,
        pendingBookings: 0
    });
    const [bookings, setBookings] = useState([]);
    const [users, setUsers] = useState([]);
    const [services, setServices] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: loggedUser } = useContext(AuthContext);

    // Estados para modales
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [bookingToAssign, setBookingToAssign] = useState(null);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [editingService, setEditingService] = useState(null);

    const translateBookingStatus = (status) => {
    const statusMap = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmada', 
        'completed': 'Completada',
        'cancelled': 'Cancelada'
    };
    return statusMap[status] || status;
};

    useEffect(() => {
        if (loggedUser && loggedUser.role === 'admin') {
            fetchData();
        }
    }, [loggedUser]);

    const fetchData = async () => {
    setLoading(true);
    try {
        const [bookingsRes, usersRes, servicesRes, employeesRes] = await Promise.all([
            axios.get(`${API}/bookings/admin`),
            axios.get(`${API}/users`),
            axios.get(`${API}/services`),
            axios.get(`${API}/users/employees`)
        ]);

        setBookings(bookingsRes.data);
        setUsers(usersRes.data);
        setServices(servicesRes.data);
        setEmployees(employeesRes.data);

        // Calcular métricas con estados corregidos
        const totalRevenue = bookingsRes.data
            .filter(booking => booking.status === 'completed')
            .reduce((sum, booking) => sum + (booking.hourly_rate * booking.total_hours), 0);

        setDashboardData({
            totalBookings: bookingsRes.data.length,
            totalUsers: usersRes.data.length,
            totalRevenue: totalRevenue,
            pendingBookings: bookingsRes.data.filter(booking => booking.status === 'pending').length
        });

        setError('');
    } catch (err) {
        console.error('Error fetching admin data:', err);
        setError(`Error al cargar datos del panel: ${err.response?.data?.detail || err.message}`);
    } finally {
        setLoading(false);
    }
};

    const updateUserRole = async (userId, newRole) => {
        try {
            await axios.put(`${API}/admin/users/${userId}/role`, { role: newRole });
            fetchData();
        } catch (err) {
            console.error('Error updating user role:', err);
            setError('Error al actualizar el rol del usuario.');
        }
    };

    const deleteUser = async (userId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar a este usuario? Esta acción es irreversible.')) {
            try {
                await axios.delete(`${API}/admin/users/${userId}`);
                fetchData();
            } catch (err) {
                console.error('Error deleting user:', err);
                setError('Error al eliminar el usuario.');
            }
        }
    };

    const handleAssignClick = (bookingId) => {
    setBookingToAssign(bookingId);
    setShowAssignModal(true);
};

const handleAssign = async () => {
    try {
        await axios.put(`${API}/bookings/${bookingToAssign}/status`, {
            status: "confirmed",
            assigned_employee_id: selectedEmployeeId
        });

        setShowAssignModal(false);
        setBookingToAssign(null);
        setSelectedEmployeeId('');
        fetchData();
    } catch (err) {
        console.error('Error assigning booking:', err);
        console.error('Response data:', err.response?.data);
        setError('Error al asignar la reserva.');
    }
};

    const handleEditService = (service) => {
        setEditingService(service);
        setShowServiceModal(true);
    };

    const handleDeleteService = async (serviceId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
            try {
                await axios.delete(`${API}/services/${serviceId}`);
                fetchData();
            } catch (err) {
                console.error('Error deleting service:', err);
                setError('Error al eliminar el servicio.');
            }
        }
    };
    const handleDeleteBooking = async (bookingId) => {
  if (window.confirm('¿Estás seguro de que quieres eliminar esta reserva? Esta acción es irreversible.')) {
    try {
      await axios.delete(`${API}/admin/bookings/${bookingId}`);
      fetchData(); 
      setError('');
    } catch (err) {
      console.error('Error deleting booking:', err);
      setError(`Error al eliminar la reserva: ${err.response?.data?.detail || err.message}`);
    }
  }
};


    const renderDashboard = () => (
        <div className="space-y-6">
            {/* Tarjetas de métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-main rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total de Reservas</p>
                            <p className="text-3xl font-bold text-blue-600">{dashboardData.totalBookings}</p>
                        </div>
                        <div className="bg-blue-100 rounded-full p-3">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-main rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total de Usuarios</p>
                            <p className="text-3xl font-bold text-green-600">{dashboardData.totalUsers}</p>
                        </div>
                        <div className="bg-green-100 rounded-full p-3">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-main rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                            <p className="text-3xl font-bold text-purple-600">${dashboardData.totalRevenue.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-purple-100 rounded-full p-3">
                            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-main rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Reservas Pendientes</p>
                            <p className="text-3xl font-bold text-orange-600">{dashboardData.pendingBookings}</p>
                        </div>
                        <div className="bg-orange-100 rounded-full p-3">
                            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reservas recientes */}
            <div className="bg-main rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Reservas Recientes</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2">Cliente</th>
                                <th className="text-left py-2">Servicio</th>
                                <th className="text-left py-2">Fecha</th>
                                <th className="text-left py-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.slice(0, 5).map((booking) => (
                                <tr key={booking.id} className="border-b last:border-b-0">
                                    <td className="py-2">{booking.full_name}</td>
                                    <td className="py-2">{booking.service_name}</td>
                                    <td className="py-2">{new Date(booking.booking_date).toLocaleDateString()}</td>
                                    <td className="py-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                          booking.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                                          booking.status === 'confirmed' ? 'bg-green-200 text-green-800' :
                                          'bg-gray-200 text-gray-800'
                                      }`}>
                                          {translateBookingStatus(booking.status)}
                                      </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderBookings = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold text-gray-900">Gestión de Reservas</h2>
      <div className="text-sm text-gray-600">
        Total de reservas: {bookings.length}
      </div>
    </div>
    
    <div className="overflow-x-auto">
      <table className="min-w-full bg-main rounded-lg shadow-lg">
        <thead className="bg-blue-600 text-white">
          <tr>
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Cliente</th>
            <th className="p-3 text-left">Servicio</th>
            <th className="p-3 text-left">Fecha</th>
            <th className="p-3 text-left">Hora</th>
            <th className="p-3 text-left">Estado</th>
            <th className="p-3 text-left">Asignado</th>
            <th className="p-3 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-b last:border-b-0 hover:bg-blue-50">
              <td className="p-3">
                <span className="text-sm font-mono text-gray-600">
                  #{booking.id.substring(0, 8)}
                </span>
              </td>
              <td className="p-3">
                <div>
                  <div className="font-medium text-gray-900">{booking.full_name}</div>
                  <div className="text-sm text-gray-500">ID: {booking.user_id.substring(0, 8)}</div>
                </div>
              </td>
              <td className="p-3">
                <div>
                  <div className="font-medium text-gray-900">{booking.service_name}</div>
                  <div className="text-sm text-gray-500">
                    ${booking.hourly_rate?.toLocaleString('es-CO') || 'N/A'} COP/hora
                  </div>
                </div>
              </td>
              <td className="p-3">
                <span className="text-sm">
                  {new Date(booking.booking_date).toLocaleDateString('es-CO')}
                </span>
              </td>
              <td className="p-3">
                <div className="text-sm">
                  <div>{booking.start_time} - {booking.end_time}</div>
                  <div className="text-gray-500">
                    {booking.total_hours}h total
                  </div>
                </div>
              </td>
              <td className="p-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {translateBookingStatus(booking.status)}
                </span>
              </td>
              <td className="p-3">
                {booking.assigned_employee_id && booking.employee_full_name ? (
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {booking.employee_full_name}
                    </div>
                    {booking.employee_phone && (
                      <div className="text-xs text-gray-500">
                        {booking.employee_phone}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-500 italic text-sm">No asignado</span>
                )}
              </td>
              <td className="p-3">
                <div className="flex flex-col space-y-2">
                  {!booking.assigned_employee_id && booking.status === 'pending' && (
                    <button
                      onClick={() => handleAssignClick(booking.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Asignar
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteBooking(booking.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    
    {bookings.length === 0 && (
      <div className="text-center text-gray-500 py-12">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-xl">No hay reservas en el sistema</p>
        <p className="text-gray-400">Las reservas aparecerán aquí una vez que los usuarios las creen</p>
      </div>
    )}
  </div>
);

    const renderServices = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Gestión de Servicios</h2>
                <button
                    onClick={() => {
                        setEditingService(null);
                        setShowServiceModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Agregar Servicio
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                    <div key={service.id} className="bg-main rounded-xl shadow-lg overflow-hidden">
                        <img src={service.image_url} alt={service.name} className="w-full h-48 object-cover" />
                        <div className="p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.name}</h3>
                            <p className="text-gray-600 mb-4">{service.description}</p>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-2xl font-bold text-blue-600">${service.hourly_rate.toLocaleString('es-CO', { minimumFractionDigits: 0 })} COP</span>
                                <span className="text-sm text-gray-500">{service.estimated_duration} min</span>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleEditService(service)}
                                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDeleteService(service.id)}
                                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-main rounded-lg shadow-lg">
                <thead className="bg-blue-600 text-white">
                    <tr>
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Teléfono</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id} className="border-b last:border-b-0 even:bg-blue-50">
                            <td className="p-3">{user.full_name}</td>
                            <td className="p-3">{user.email}</td>
                            <td className="p-3">{user.phone}</td>
                            <td className="p-3">
                                <select
                                    value={user.role}
                                    onChange={e => updateUserRole(user.id, e.target.value)}
                                    className="border border-gray-300 p-1 rounded"
                                    disabled={loggedUser.id === user.id || loggedUser.role !== 'admin' || user.email === 'admin@cleaningservice.com'}
                                >
                                    <option value="customer">Customer</option>
                                    <option value="employee">Employee</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </td>
                            <td className="p-3">
                                {user.email !== 'admin@cleaningservice.com' && (
                                    <button
                                        onClick={() => deleteUser(user.id)}
                                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                                    >
                                        Eliminar
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    // Función para renderizar el contenido según la pestaña activa
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return renderDashboard();
            case 'bookings':
                return renderBookings();
            case 'services':
                return renderServices();
            case 'users':
                return renderUsers();
            default:
                return renderDashboard();
        }
    };

    if (loading) {
        return <div className="text-center py-12">Cargando datos del panel...</div>;
    }

    if (error) {
        return <div className="text-center py-12 text-red-600">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 text-center">Panel de Administración</h1>
            <div className="flex justify-center space-x-4">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    Tablero
                </button>
                <button
                    onClick={() => setActiveTab('bookings')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        activeTab === 'bookings' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    Reservas
                </button>
                <button
                    onClick={() => setActiveTab('services')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        activeTab === 'services' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    Servicios
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    Usuarios
                </button>
            </div>
            {renderContent()}

            {/* Modal de asignación */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-main p-6 rounded-lg shadow-xl w-full max-w-sm space-y-4">
                        <h3 className="text-xl font-bold text-gray-900">Asignar Empleado</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Selecciona un empleado
                            </label>
                            <select
                                value={selectedEmployeeId}
                                onChange={e => setSelectedEmployeeId(e.target.value)}
                                className="w-full px-3 py-2 border border-primary rounded-lg"
                                required
                            >
                                <option value="">-- Seleccionar --</option>
                                {employees.map(employee => (
                                    <option key={employee.id} value={employee.id}>
                                        {employee.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAssign}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                disabled={!selectedEmployeeId}
                            >
                                Asignar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de servicio */}
            {showServiceModal && (
                <ServiceModal
                    service={editingService}
                    onClose={() => {
                        setShowServiceModal(false);
                        setEditingService(null);
                    }}
                    onSave={fetchData}
                />
            )}
        </div>
    );
}

// Modal para crear/editar servicios
function ServiceModal({ service, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: service?.name || '',
        description: service?.description || '',
        hourly_rate: service?.hourly_rate || '',
        estimated_duration: service?.estimated_duration || '',
        image_url: service?.image_url || ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (service) {
                await axios.put(`${API}/services/${service.id}`, formData);
            } else {
                await axios.post(`${API}/services`, formData);
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving service:', error);
            alert('Error al guardar el servicio');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-main rounded-xl p-6 max-w-lg w-full space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">
                        {service ? 'Editar Servicio' : 'Agregar Servicio'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nombre del servicio
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Precio por hora (COP)
                        </label>
                        <input
                            type="number"
                            name="hourly_rate"
                            value={formData.hourly_rate}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Duración estimada (minutos)
                        </label>
                        <input
                            type="number"
                            name="estimated_duration"
                            value={formData.estimated_duration}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            URL de imagen
                        </label>
                        <input
                            type="url"
                            name="image_url"
                            value={formData.image_url}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Componente para el panel del empleado
    function EmployeePanel() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        if (user) {
            fetchAssignments();
        }
    }, [user]);

    const fetchAssignments = async () => {
        try {
            const response = await axios.get(`${API}/employee/assignments/${user.id}`);
            setAssignments(response.data);
        } catch (error) {
            console.error('Error fetching employee assignments:', error);
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
        <div className="space-y-6">

            <h1 className="text-3xl font-bold text-gray-900 text-center">Mis Asignaciones</h1>
            {assignments.length === 0 ? (
                <div className="text-center text-gray-500">No tiene asignaciones de reservas.</div>
            ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="bg-blue-600 text-white p-4">
                        <h2 className="text-xl font-semibold">Mis Asignaciones</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-3 text-left font-semibold">Servicio</th>
                                    <th className="p-3 text-left font-semibold">Cliente</th>
                                    <th className="p-3 text-left font-semibold">Fecha</th>
                                    <th className="p-3 text-left font-semibold">Horario</th>
                                    <th className="p-3 text-left font-semibold">Dirección</th>
                                    <th className="p-3 text-left font-semibold">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignments.map((assignment) => (
                                    <tr key={assignment.id} className="border-b hover:bg-gray-50">
                                        <td className="p-3">{assignment.service_name}</td>
                                        <td className="p-3">{assignment.customer_full_name}</td>
                                        <td className="p-3">{new Date(assignment.booking_date).toLocaleDateString()}</td>
                                        <td className="p-3">{assignment.start_time} - {assignment.end_time}</td>
                                        <td className="p-3">{assignment.address}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                assignment.status === 'pending' ? 'bg-yellow-200 text-yellow-800' :
                                                assignment.status === 'confirmed' ? 'bg-green-200 text-green-800' :
                                                assignment.status === 'completed' ? 'bg-blue-200 text-blue-800' :
                                                'bg-gray-200 text-gray-800'
                                            }`}>
                                                {assignment.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                </tbody>
            </table>
        </div>
    </div>
)}
</div>
);
}

export default App;