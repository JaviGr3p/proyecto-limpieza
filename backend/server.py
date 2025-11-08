from fastapi import FastAPI, Form, APIRouter, WebSocket, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from bson import ObjectId
from bson.json_util import dumps
import os
import uuid
import logging
from pathlib import Path
import stripe
import json

def serialize_objectid(obj):
    """Convierte ObjectId de MongoDB a string para JSON"""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: serialize_objectid(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_objectid(item) for item in obj]
    return obj

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuración del logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Stripe configuración
stripe.api_key = os.environ['STRIPE_API_KEY']
stripe_publishable_key = os.environ['STRIPE_PUBLISHABLE_KEY']

# MongoDB conexión
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()
app = FastAPI(title="Plataforma de reservas de servicios de limpieza")
api_router = APIRouter(prefix="/api")

# Models
class TokenData(BaseModel):
    username: Optional[str] = None

class UserInDB(BaseModel):
    id: str
    username: str
    hashed_password: str
    full_name: Optional[str] = None
    role: str = "customer"

class User(BaseModel):
    username: str
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: Optional[str] = None
    phone: str
    role: str = "customer" 
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Campos opcionales para empleados
    document_number: Optional[str] = None
    profile_picture_url: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    phone: str
    password: str
    role: str = "customer"
    # Campos opcionales para empleados
    document_number: Optional[str] = None
    profile_picture_url: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class Service(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    hourly_rate: float
    estimated_duration: int
    image_url: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceCreate(BaseModel):
    name: str
    description: str
    hourly_rate: float
    estimated_duration: int
    image_url: str = ""

class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    service_id: str
    service_name: str
    booking_date: datetime
    start_time: str
    end_time: str
    hourly_rate: Optional[int] = None
    total_hours: float
    total_amount: float
    status: str = "pending"
    special_instructions: str = ""
    address: str
    payment_session_id: str = ""
    assigned_employee_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Campo para la respuesta del API, no se guarda en la DB
    assigned_employee: Optional[Dict] = None

class BookingCreate(BaseModel):
    service_id: str
    booking_date: str
    start_time: str
    end_time: str
    total_hours: float
    special_instructions: str = ""
    address: str

class BookingIn(BaseModel):
    service_id: str
    service_name: str
    user_id: str
    booking_date: str
    start_time: str
    end_time: str
    hourly_rate: Optional[int] = None
    status: str = "pending"
    address: str
    assigned_employee_id: Optional[str] = None

class BookingUpdate(BaseModel):
    status: str
    assigned_employee_id: Optional[str] = None

class BookingAssign(BaseModel):
    assigned_employee_id: str

class Assignment(BaseModel):
    id: str
    user_id: str
    service_name: str
    booking_date: str
    start_time: str
    end_time: str
    address: str
    customer_full_name: Optional[str] = None

class CheckoutSessionRequest(BaseModel):
    booking_id: str
    origin_url: str

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: str
    session_id: str
    amount: float
    currency: str = "usd"
    payment_status: str = "pending"
    metadata: Dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    user_id: str
    rating: int
    comment: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewCreate(BaseModel):
    booking_id: str
    rating: int
    comment: str

# Notification Manager
class NotificationManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.admin_connections: Dict[str, WebSocket] = {}
        self.client_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"Conexión establecida para el usuario: {user_id}")

    async def connect_admin(self, websocket: WebSocket, admin_id: str):
        await websocket.accept()
        self.admin_connections[admin_id] = websocket
        logger.info(f"Admin conectado: {admin_id}")

    async def connect_client(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.client_connections[user_id] = websocket
        logger.info(f"Cliente conectado: {user_id}")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"Conexión cerrada para el usuario: {user_id}")

    def disconnect_admin(self, admin_id: str):
        if admin_id in self.admin_connections:
            del self.admin_connections[admin_id]
            logger.info(f"Admin desconectado: {admin_id}")

    def disconnect_client(self, user_id: str):
        if user_id in self.client_connections:
            del self.client_connections[user_id]
            logger.info(f"Cliente desconectado: {user_id}")

    async def send_personal_message(self, message_data: dict, user_id: str):
        """Envía mensaje JSON estructurado"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message_data))
            except Exception as e:
                logger.error(f"Error enviando mensaje a {user_id}: {e}")

    async def notify_booking_confirmed(self, user_id: str, booking_data: Dict):
        """Notifica confirmación de reserva con datos estructurados"""
        message_data = {
            "type": "notification",
            "category": "booking_confirmed", 
            "title": "Reserva Confirmada",
            "message": f"¡Tu reserva {booking_data.get('id')} ha sido confirmada! Un empleado ha sido asignado.",
            "booking_id": booking_data.get('id'),
            "timestamp": datetime.utcnow().isoformat()
        }
        await self.send_personal_message(message_data, user_id)

    async def notify_new_booking(self, booking_data: Dict):
        """Notifica nueva reserva a todos los admins"""
        message_data = {
            "type": "notification",
            "category": "new_booking",
            "title": "Nueva Reserva",
            "message": f"Nueva reserva: {booking_data.get('service')} por {booking_data.get('user')}",
            "booking_id": booking_data.get('id'),
            "service": booking_data.get('service'),
            "customer": booking_data.get('user'),
            "amount": booking_data.get('amount'),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        for admin_id, websocket in self.admin_connections.items():
            try:
                await websocket.send_text(json.dumps(message_data))
            except Exception as e:
                logger.error(f"Error enviando notificación a admin {admin_id}: {e}")

notification_manager = NotificationManager()

# Utility functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_active_user(token: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": token_data.username})
    if user is None:
        raise credentials_exception

    user_data = {
        "id": user["id"],
        "username": user["email"],  
        "email": user["email"],
        "full_name": user.get("full_name", ""),
        "phone": user.get("phone", ""),
        "role": user.get("role", "customer"),
        "hashed_password": user["hashed_password"],
        "is_active": user.get("is_active", True),
        "created_at": user.get("created_at", datetime.utcnow()),
        "document_number": user.get("document_number"),
        "profile_picture_url": user.get("profile_picture_url")
    }
    
    return User(**user_data)

async def get_current_user(current_user: User = Depends(get_current_active_user)):
    return current_user

async def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Cleaning Service API", "status": "running"}

# WebSocket endpoints
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, token: str = None):
    """WebSocket principal con validación de token"""
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if username:
                user = await db.users.find_one({"email": username})
                if user and user["id"] == user_id:
                    await notification_manager.connect(user_id, websocket)
                    try:
                        while True:
                            data = await websocket.receive_text()
                            await websocket.send_text(f"Echo: {data}")
                    except Exception as e:
                        logger.error(f"WebSocket error for user {user_id}: {e}")
                    finally:
                        notification_manager.disconnect(user_id)
                    return
        except JWTError as e:
            logger.error(f"JWT Error in WebSocket: {e}")
    
    await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or missing token")

@app.websocket("/ws/employee/{employee_id}")
async def employee_websocket(websocket: WebSocket, employee_id: str, token: str = None):
    """WebSocket para empleados"""
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if username:
                user = await db.users.find_one({"email": username})
                if user and user["id"] == employee_id and user.get("role") == "employee":
                    await notification_manager.connect(employee_id, websocket)
                    try:
                        while True:
                            data = await websocket.receive_text()
                            await websocket.send_text(f"Employee Echo: {data}")
                    except Exception as e:
                        logger.error(f"Employee WebSocket error for {employee_id}: {e}")
                    finally:
                        notification_manager.disconnect(employee_id)
                    return
        except JWTError as e:
            logger.error(f"JWT Error in Employee WebSocket: {e}")
    
    await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or missing token")

@app.websocket("/ws/admin/{admin_id}")
async def admin_websocket(websocket: WebSocket, admin_id: str, token: str = None):
    """WebSocket para administradores"""
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if username:
                user = await db.users.find_one({"email": username})
                if user and user["id"] == admin_id and user.get("role") == "admin":
                    await notification_manager.connect_admin(websocket, admin_id)
                    try:
                        while True:
                            data = await websocket.receive_text()
                            await websocket.send_text(f"Admin Echo: {data}")
                    except Exception as e:
                        logger.error(f"Admin WebSocket error for {admin_id}: {e}")
                    finally:
                        notification_manager.disconnect_admin(admin_id)
                    return
        except JWTError as e:
            logger.error(f"JWT Error in Admin WebSocket: {e}")
    
    await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or missing token")

# Authentication endpoints
@api_router.post("/auth/register")
async def register(user_in: UserCreate):
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(user_in.password)
    user_doc = {
        "id": user_id,
        "username": user_in.username,
        "email": user_in.email,
        "full_name": user_in.full_name,
        "phone": user_in.phone,
        "hashed_password": hashed_password,
        "role": user_in.role,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "document_number": user_in.document_number,
        "profile_picture_url": user_in.profile_picture_url
    }
    await db.users.insert_one(user_doc)
    return {"message": "User registered successfully"}

@api_router.post("/auth/login")
async def login(username: str = Form(...), password: str = Form(...)):
    user = await db.users.find_one({"email": username})
    if not user or not pwd_context.verify(password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user["email"]})
    user_response = {
        "id": user["id"],
        "email": user["email"],
        "full_name": user.get("full_name", ""),
        "role": user.get("role", "customer")
    }
    return {"access_token": access_token, "token_type": "bearer", "user": user_response}

@api_router.get("/auth/me")
async def read_current_user(current_user: User = Depends(get_current_active_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "phone": current_user.phone
    }

@api_router.post("/auth/login-form")
async def login_form(username: str = Form(...), password: str = Form(...)):
    """Endpoint alternativo para login con form-data"""
    user = await db.users.find_one({"email": username})
    if not user or not pwd_context.verify(password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user["email"]})
    user_response = {
        "id": user["id"],
        "email": user["email"],
        "full_name": user.get("full_name", ""),
        "role": user.get("role", "customer")
    }
    return {"access_token": access_token, "token_type": "bearer", "user": user_response}

# Service endpoints
@api_router.get("/services", response_model=List[Service])
async def get_services():
    services = await db.services.find({"is_active": True}).to_list(1000)
    return [Service(**service) for service in services]

@api_router.post("/services", response_model=Service)
async def create_service(service: ServiceCreate, current_user: User = Depends(get_current_admin)):
    new_service = Service(**service.dict())
    await db.services.insert_one(new_service.dict())
    return new_service

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(service_id: str, service: ServiceCreate, current_user: User = Depends(get_current_admin)):
    service_dict = service.dict()
    await db.services.update_one({"id": service_id}, {"$set": service_dict})
    updated_service = await db.services.find_one({"id": service_id})
    if not updated_service:
        raise HTTPException(status_code=404, detail="Service not found")
    return Service(**updated_service)

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, current_user: User = Depends(get_current_admin)):
    await db.services.update_one({"id": service_id}, {"$set": {"is_active": False}})
    return {"message": "Service deleted successfully"}

# Booking endpoints
@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking: BookingCreate, current_user: User = Depends(get_current_user)):
    service = await db.services.find_one({"id": booking.service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    total_amount = booking.total_hours * service["hourly_rate"]
    booking_dict = booking.dict()
    booking_dict["user_id"] = current_user.id
    booking_dict["service_name"] = service["name"]
    booking_dict["hourly_rate"] = service["hourly_rate"]
    booking_dict["total_amount"] = total_amount
    booking_dict["booking_date"] = datetime.fromisoformat(booking.booking_date)
    
    new_booking = Booking(**booking_dict)
    await db.bookings.insert_one(new_booking.dict())
    
    await notification_manager.notify_new_booking({
        "service": service["name"],
        "amount": total_amount,
        "user": current_user.full_name,
        "id": new_booking.id
    })
    
    return new_booking

# Endpoint alternativo para crear bookings (compatible con BookingIn)
@api_router.post("/bookings/alt", response_model=Dict)
async def create_booking_alt(booking_in: BookingIn):
    booking_id = str(uuid.uuid4())
    booking_doc = {**booking_in.dict(), "id": booking_id, "created_at": datetime.utcnow().isoformat()}
    await db.bookings.insert_one(booking_doc)
    return {"message": "Booking created successfully", "booking_id": booking_id}

@api_router.get("/bookings", response_model=List[Dict])
async def get_all_bookings():
    """Obtiene todas las reservas con información enriquecida de usuarios y empleados"""
    bookings = await db.bookings.find().to_list(1000)

    for booking in bookings:
        user = await db.users.find_one({"id": booking["user_id"]})
        if user:
            booking["full_name"] = user.get("full_name", "Usuario Desconocido")
        else:
            booking["full_name"] = "Usuario Desconocido"
            
        if booking.get("assigned_employee_id"):
            employee = await db.users.find_one({"id": booking["assigned_employee_id"]})
            if employee:
                booking["employee_full_name"] = employee.get("full_name", "Empleado Desconocido")
            else:
                booking["employee_full_name"] = "Empleado Desconocido"
        else:
            booking["employee_full_name"] = None
            
    return bookings

@api_router.get("/bookings/user")
async def get_user_bookings(current_user: User = Depends(get_current_user)):
    """Obtiene las reservas del usuario actual, enriquecidas con datos del empleado."""
    bookings = await db.bookings.find({"user_id": current_user.id}).to_list(1000)
    enriched_bookings = []
    
    for booking in bookings:
        booking = serialize_objectid(booking)
        
        if not booking.get("service_name") and booking.get("service_id"):
            service = await db.services.find_one({"id": booking["service_id"]})
            if service:
                booking["service_name"] = service["name"]
                booking["service_description"] = service.get("description", "")
        
        # Información del empleado
        booking["employee_full_name"] = None
        booking["employee_phone"] = None
        
        if booking.get("assigned_employee_id"):
            employee = await db.users.find_one({"id": booking["assigned_employee_id"]})
            if employee:
                booking["employee_full_name"] = employee.get("full_name")
                booking["employee_phone"] = employee.get("phone")
        
        booking.setdefault("service_description", "")
        booking.setdefault("status", "pending")
        
        enriched_bookings.append(booking)
    
    return enriched_bookings

@api_router.get("/bookings/admin")
async def get_all_bookings_admin(current_user: User = Depends(get_current_admin)):
    """Obtiene todas las reservas para administradores"""
    bookings = await db.bookings.find().to_list(1000)
    enriched_bookings = []
    
    for booking in bookings:
        booking = serialize_objectid(booking)
        
        if not booking.get("service_name") and booking.get("service_id"):
            service = await db.services.find_one({"id": booking["service_id"]})
            if service:
                booking["service_name"] = service["name"]
        
        user = await db.users.find_one({"id": booking["user_id"]})
        if user:
            booking["full_name"] = user.get("full_name", "Usuario Desconocido")
        else:
            booking["full_name"] = "Usuario Desconocido"
        
        # Información del empleado
        if booking.get("assigned_employee_id"):
            employee = await db.users.find_one({"id": booking["assigned_employee_id"]})
            if employee:
                booking["employee_full_name"] = employee.get("full_name")
                booking["employee_phone"] = employee.get("phone")
        
        enriched_bookings.append(booking)
    
    return enriched_bookings

@api_router.get("/employee/assignments/{employee_id}")
async def get_employee_assignments(
    employee_id: str, 
    current_user: User = Depends(get_current_active_user)
):
    """Obtiene todas las asignaciones de reservas para un empleado específico."""
    employee_user = await db.users.find_one({"id": employee_id, "role": "employee"})
    if not employee_user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if current_user.role != "admin" and current_user.id != employee_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these assignments")
    
    bookings = await db.bookings.find({"assigned_employee_id": employee_id}).to_list(1000)
    
    enriched_bookings = []
    for booking in bookings:
        booking = serialize_objectid(booking)
        
        if not booking.get("service_name") and booking.get("service_id"):
            service = await db.services.find_one({"id": booking["service_id"]})
            if service:
                booking["service_name"] = service["name"]
        
        customer = await db.users.find_one({"id": booking["user_id"]})
        if customer:
            booking["customer_full_name"] = customer.get("full_name", "Cliente Desconocido")
        else:
            booking["customer_full_name"] = "Cliente Desconocido"
        
        enriched_bookings.append(booking)
    
    return enriched_bookings

@api_router.put("/bookings/{booking_id}/assign")
async def assign_employee(booking_id: str, data: Dict):
    """Asigna un empleado a una reserva"""
    employee_id = data.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=400, detail="Employee ID is required")

    employee = await db.users.find_one({"id": employee_id, "role": "employee"})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"assigned_employee_id": employee_id, "status": "confirmed"}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found or already assigned")
    
    booking = await db.bookings.find_one({"id": booking_id})
    if booking:
        await notification_manager.notify_booking_confirmed(
            user_id=booking["user_id"],
            booking_data={"id": booking_id, "assigned_employee_id": employee_id}
        )
    
    return {"message": "Employee assigned successfully", "success": True}

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    booking_update: BookingUpdate,
    current_user: User = Depends(get_current_admin)
):
    """Actualiza el estado de una reserva"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    update_data = {"status": booking_update.status}
    
    if booking_update.assigned_employee_id:
        employee = await db.users.find_one({
            "id": booking_update.assigned_employee_id, 
            "role": "employee"
        })
        if not employee:
            raise HTTPException(
                status_code=404, 
                detail="Assigned employee not found or is not an employee"
            )
        update_data["assigned_employee_id"] = booking_update.assigned_employee_id

    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    if booking_update.status == "confirmed":
        await notification_manager.notify_booking_confirmed(
            user_id=booking["user_id"],
            booking_data={"id": booking_id}
        )
    
    return {"message": "Booking status updated successfully"}

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, current_user: User = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id, "user_id": current_user.id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.delete_one({"id": booking_id})
    return {"message": "Booking deleted successfully"}

@api_router.delete("/admin/bookings/{booking_id}")
async def admin_delete_booking(booking_id: str, current_user: User = Depends(get_current_admin)):
    """Permite a los administradores eliminar cualquier reserva"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    logger.info(f"Admin {current_user.id} ({current_user.email}) eliminando reserva {booking_id}")
    
    await db.bookings.delete_one({"id": booking_id})
    return {"message": "Booking deleted successfully", "success": True}

@api_router.delete("/bookings/{booking_id}/admin")
async def delete_booking_admin(booking_id: str, current_user: User = Depends(get_current_admin)):
    """Endpoint alternativo para que los admins eliminen reservas"""
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    await db.bookings.delete_one({"id": booking_id})
    return {"message": "Booking deleted successfully", "success": True}

# User endpoints
@api_router.get("/users")
async def get_all_users(current_user: User = Depends(get_current_admin)):
    users = await db.users.find().to_list(1000)
    user_list = []
    for user in users:
        user_data = {
            "id": user["id"],
            "username": user.get("username", user["email"]),
            "email": user["email"],
            "full_name": user.get("full_name", ""),
            "phone": user.get("phone", ""),
            "role": user.get("role", "customer"),
            "hashed_password": user["hashed_password"],
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at", datetime.utcnow()),
            "document_number": user.get("document_number"),
            "profile_picture_url": user.get("profile_picture_url")
        }
        user_list.append(User(**user_data))
    return user_list

@api_router.get("/users/employees")
async def get_employees(current_user: User = Depends(get_current_admin)):
    employees = await db.users.find({"role": "employee"}).to_list(1000)
    employee_list = []
    for employee in employees:
        employee_data = {
            "id": employee["id"],
            "username": employee.get("username", employee["email"]),
            "email": employee["email"],
            "full_name": employee.get("full_name", ""),
            "phone": employee.get("phone", ""),
            "role": employee.get("role", "employee"),
            "hashed_password": employee["hashed_password"],
            "is_active": employee.get("is_active", True),
            "created_at": employee.get("created_at", datetime.utcnow()),
            "document_number": employee.get("document_number"),
            "profile_picture_url": employee.get("profile_picture_url")
        }
        employee_list.append(User(**employee_data))
    return employee_list

@api_router.get("/users/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = {
        "id": user["id"],
        "username": user.get("username", user["email"]),
        "email": user["email"],
        "full_name": user.get("full_name", ""),
        "phone": user.get("phone", ""),
        "role": user.get("role", "customer"),
        "hashed_password": user["hashed_password"],
        "is_active": user.get("is_active", True),
        "created_at": user.get("created_at", datetime.utcnow()),
        "document_number": user.get("document_number"),
        "profile_picture_url": user.get("profile_picture_url")
    }
    
    return User(**user_data)

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role_data: dict, current_user: User = Depends(get_current_admin)):
    role = role_data.get("role")
    if role not in ["customer", "employee", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    return {"message": "User role updated successfully"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["email"] == "admin@cleaningservice.com":
        raise HTTPException(status_code=403, detail="Cannot delete main admin user")
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted successfully"}

# Payment endpoints
@api_router.post("/create-checkout-session")
@api_router.post("/payments/create-checkout-session")
async def create_checkout_session(
    data: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user)
):
    booking = await db.bookings.find_one({"id": data.booking_id, "user_id": current_user.id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f"Service Booking: {booking['service_name']}",
                    },
                    'unit_amount': int(booking['total_amount'] * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{data.origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{data.origin_url}/payment-cancel",
            metadata={
                "booking_id": data.booking_id,
                "user_id": current_user.id
            }
        )
        await db.bookings.update_one(
            {"id": data.booking_id}, 
            {"$set": {"payment_session_id": session.id}}
        )
        return {"url": session.url, "session_id": session.id}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@api_router.get("/payments/checkout-status/{session_id}")
async def get_checkout_status(session_id: str, current_user: User = Depends(get_current_user)):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return {
            "payment_status": session.payment_status,
            "status": session.status,
            "amount_total": session.amount_total / 100 if session.amount_total else 0,
            "currency": session.currency
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@api_router.get("/payments/stripe-config")
async def get_stripe_config():
    return {"publishable_key": stripe_publishable_key}

@api_router.get("/reviews", response_model=List[Review])
async def get_reviews():
    reviews = await db.reviews.find().to_list(1000)
    return [Review(**review) for review in reviews]

@api_router.post("/reviews", response_model=Review)
async def create_review(review: ReviewCreate, current_user: User = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": review.booking_id, "user_id": current_user.id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed bookings")
    
    review_dict = review.dict()
    review_dict["user_id"] = current_user.id
    new_review = Review(**review_dict)
    await db.reviews.insert_one(new_review.dict())
    return new_review

# Admin dashboard
@api_router.get("/admin/dashboard")
async def get_admin_dashboard(current_user: User = Depends(get_current_admin)):
    total_bookings = await db.bookings.count_documents({})
    total_users = await db.users.count_documents({})
    total_revenue = await db.bookings.aggregate([
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    return {
        "total_bookings": total_bookings,
        "total_users": total_users,
        "total_revenue": total_revenue[0]["total"] if total_revenue else 0,
        "pending_bookings": pending_bookings
    }

@api_router.post("/simulate-new-booking")
async def simulate_new_booking(booking_data: dict):
    """Endpoint para simular una nueva reserva y probar notificaciones"""
    try:
        await notification_manager.notify_new_booking(booking_data)
        return {"message": "Simulación de nueva reserva enviada", "success": True}
    except Exception as e:
        logger.error(f"Error en simulación de nueva reserva: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@api_router.post("/simulate-booking-confirmed")  
async def simulate_booking_confirmed(data: dict):
    """Endpoint para simular confirmación de reserva y probar notificaciones"""
    try:
        booking_id = data.get("booking_id")
        employee_id = data.get("employee_id")

        if employee_id:
            await db.bookings.update_one(
                {"id": booking_id}, 
                {"$set": {"status": "confirmed", "assigned_employee_id": employee_id}}
            )
        else:
            await db.bookings.update_one(
                {"id": booking_id}, 
                {"$set": {"status": "confirmed"}}
            )

        booking = await db.bookings.find_one({"id": booking_id})
        if booking:
            await notification_manager.notify_booking_confirmed(
                user_id=booking["user_id"],
                booking_data={"id": booking_id}
            )
        return {"message": "Simulación de confirmación enviada", "success": True}
    except Exception as e:
        logger.error(f"Error en simulación de confirmación: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

async def initialize_default_data():
    """Inicializa datos por defecto: servicios y usuarios admin/empleado"""
    
    service_count = await db.services.count_documents({})
    if service_count == 0:
        default_services = [
            {
                "id": str(uuid.uuid4()),
                "name": "Limpieza Básica",
                "description": "Servicio de limpieza estándar que incluye aspirado, trapeado, limpieza de baños y cocina",
                "hourly_rate": 25000.0,
                "estimated_duration": 180,
                "image_url": "https://images.unsplash.com/photo-1556910638-6cdac31d44dc",
                "is_active": True,
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Limpieza Profunda",
                "description": "Servicio de limpieza integral que incluye todas las áreas, electrodomésticos y lugares de difícil acceso",
                "hourly_rate": 35000.0,
                "estimated_duration": 300,
                "image_url": "https://images.unsplash.com/photo-1528255671579-01b9e182ed1d",
                "is_active": True,
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Limpieza de Oficina",
                "description": "Servicio profesional de limpieza para espacios de trabajo, salas de reuniones y áreas comunes",
                "hourly_rate": 30000.0,
                "estimated_duration": 240,
                "image_url": "https://images.unsplash.com/photo-1644460187708-5e04f6b5ae75",
                "is_active": True,
                "created_at": datetime.utcnow()
            }
        ]
        await db.services.insert_many(default_services)
        logger.info("Servicios por defecto creados")

    # Crear usuario administrador por defecto
    admin_email = "admin@cleaningservice.com"
    admin_exists = await db.users.find_one({"email": admin_email, "role": "admin"})
    
    if not admin_exists:
        admin_user = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "email": admin_email,
            "full_name": "Administrador",
            "phone": "555-0123",
            "role": "admin",
            "hashed_password": get_password_hash("admin123"),
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(admin_user)
        logger.info("Usuario administrador creado")

    # Crear empleado de prueba
    employee_email = "empleado@cleaningservice.com"
    employee_exists = await db.users.find_one({"email": employee_email, "role": "employee"})
    if not employee_exists:
        employee_user = {
            "id": str(uuid.uuid4()),
            "username": "empleado1",
            "email": employee_email,
            "full_name": "Juan Pérez",
            "phone": "3001234567",
            "role": "employee",
            "hashed_password": get_password_hash("empleado123"),
            "is_active": True,
            "created_at": datetime.utcnow(),
            "document_number": "123456789",
            "profile_picture_url": "https://images.unsplash.com/photo-1599566150163-29194dcaad36"
        }
        await db.users.insert_one(employee_user)
        logger.info("Usuario empleado creado")

# Event handlers
@app.on_event("startup")
async def startup_event():
    await initialize_default_data()

@app.on_event("shutdown")
async def shutdown_event():
    client.close()

# Include API router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    )