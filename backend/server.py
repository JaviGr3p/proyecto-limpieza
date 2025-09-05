from fastapi import FastAPI, APIRouter, WebSocket, HTTPException, Depends, status
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
import os
import uuid
import logging
from pathlib import Path
import stripe

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configuración del logging
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

# WebSocket Manager 
from websocket_manager import notification_manager

# Models
class StatusUpdate(BaseModel):
    status: str

class CheckoutSessionRequest(BaseModel):
    booking_id: str
    origin_url: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: str
    phone: str
    role: str = "customer"
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: str
    full_name: str
    phone: str
    password: str
    role: str = "customer"

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
    booking_date: datetime
    start_time: str
    end_time: str
    total_hours: float
    total_amount: float
    status: str = "pending"
    special_instructions: str = ""
    address: str
    payment_session_id: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BookingCreate(BaseModel):
    service_id: str
    booking_date: str
    start_time: str
    end_time: str
    total_hours: float
    special_instructions: str = ""
    address: str

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
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return User(**user)

async def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

# WebSocket para clientes
@app.websocket("/ws/client/{user_id}")
async def client_websocket(websocket: WebSocket, user_id: str):
    await notification_manager.connect_client(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()  # Mantener conexión viva
    except:
        notification_manager.disconnect_client(user_id)

# WebSocket para admins  
@app.websocket("/ws/admin/{admin_id}")
async def admin_websocket(websocket: WebSocket, admin_id: str):
    await notification_manager.connect_admin(websocket, admin_id)
    try:
        while True:
            await websocket.receive_text()  # Mantener conexión viva
    except:
        notification_manager.disconnect_admin(admin_id)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Mensaje recibido: {data}")
    except Exception as e:
        print(f"WebSocket desconectado: {e}")

# Authentication endpoints
@api_router.post("/auth/register", response_model=User)
async def register(user: UserCreate):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict["hashed_password"] = hashed_password
    del user_dict["password"]
    new_user = User(**user_dict)
    await db.users.insert_one(new_user.dict())
    return new_user

@api_router.post("/auth/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

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

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["email"] == "admin@cleaningservice.com":
        raise HTTPException(status_code=403, detail="Cannot delete main admin user")
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted successfully"}

# Endpoints de reservas
@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking: BookingCreate, current_user: User = Depends(get_current_user)):
    service = await db.services.find_one({"id": booking.service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    total_amount = booking.total_hours * service["hourly_rate"]
    booking_dict = booking.dict()
    booking_dict["user_id"] = current_user.id
    booking_dict["total_amount"] = total_amount
    booking_dict["booking_date"] = datetime.fromisoformat(booking.booking_date)
    new_booking = Booking(**booking_dict)
    await db.bookings.insert_one(new_booking.dict())
    
    # Notificar a admins sobre nueva reserva
    await notification_manager.notify_new_booking({
        "service": service["name"],
        "amount": total_amount,
        "user": current_user.full_name,
        "id": new_booking.id
    })
    
    return new_booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_user_bookings(current_user: User = Depends(get_current_user)):
    bookings = await db.bookings.find({"user_id": current_user.id}).to_list(1000)
    return [Booking(**booking) for booking in bookings]

@api_router.get("/admin/bookings", response_model=List[Booking])
async def get_all_bookings(current_user: User = Depends(get_current_admin)):
    bookings = await db.bookings.find().to_list(1000)
    return [Booking(**booking) for booking in bookings]

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, current_user: User = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id, "user_id": current_user.id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.delete_one({"id": booking_id})
    return {"message": "Booking deleted successfully"}

@api_router.delete("/admin/bookings/{booking_id}")
async def admin_delete_booking(booking_id: str, current_user: User = Depends(get_current_admin)):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    await db.bookings.delete_one({"id": booking_id})
    return {"message": "Booking deleted successfully"}


@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status_update: StatusUpdate,
    current_user: User = Depends(get_current_admin)
):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": status_update.status}})
    
    # Si se confirma la reserva, notificar al cliente
    if status_update.status == "confirmed":
        await notification_manager.notify_booking_confirmed(
            user_id=booking["user_id"],
            booking_data={"id": booking_id}
        )
    
    return {"message": "Booking status updated successfully"}

# Pagos endpoints (Stripe)
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
                        'name': f"Service Booking: {booking['service_id']}",
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
        await db.bookings.update_one({"id": data.booking_id}, {"$set": {"payment_session_id": session.id}})
        return {"url": session.url, "session_id": session.id}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@api_router.get("/payments/checkout-status/{session_id}")
async def get_checkout_status(session_id: str, current_user: User = Depends(get_current_user)):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        payment_status = session.payment_status
        return {
            "payment_status": payment_status,
            "status": session.status,
            "amount_total": session.amount_total / 100 if session.amount_total else 0,
            "currency": session.currency
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@api_router.get("/payments/stripe-config")
async def get_stripe_config():
    return {"publishable_key": stripe_publishable_key}

# Review endpoints
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

# Admin endpoints
@api_router.get("/admin/users", response_model=List[User])
async def get_all_users(current_user: User = Depends(get_current_admin)):
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_user: User = Depends(get_current_admin)):
    await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    return {"message": "User role updated successfully"}

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

# Inicializar servicios predeterminados y usuario admin
@api_router.on_event("startup")
async def initialize_default_data():
    service_count = await db.services.count_documents({})
    if service_count == 0:
        default_services = [
            {
                "id": str(uuid.uuid4()),
                "name": "Basic House Cleaning",
                "description": "Standard cleaning service including dusting, vacuuming, mopping, and bathroom cleaning",
                "hourly_rate": 25.0,
                "estimated_duration": 180,
                "image_url": "https://images.unsplash.com/photo-1556910638-6cdac31d44dc",
                "is_active": True,
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Deep Cleaning",
                "description": "Comprehensive cleaning service including all areas, appliances, and hard-to-reach places",
                "hourly_rate": 35.0,
                "estimated_duration": 300,
                "image_url": "https://images.unsplash.com/photo-1528255671579-01b9e182ed1d",
                "is_active": True,
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Office Cleaning",
                "description": "Professional office cleaning service for workspaces, meeting rooms, and common areas",
                "hourly_rate": 30.0,
                "estimated_duration": 240,
                "image_url": "https://images.unsplash.com/photo-1644460187708-5e04f6b5ae75",
                "is_active": True,
                "created_at": datetime.utcnow()
            }
        ]
        await db.services.insert_many(default_services)
    admin_exists = await db.users.find_one({"role": "admin"})
    if not admin_exists:
        admin_user = User(
            email="admin@cleaningservice.com",
            full_name="Admin User",
            phone="555-0123",
            role="admin",
            hashed_password=get_password_hash("admin123")
        )
        await db.users.insert_one(admin_user.dict())

# Simulación de notificaciones para pruebas
@api_router.post("/simulate-new-booking")
async def simulate_new_booking(booking_data: dict):
    """Endpoint para simular una nueva reserva y probar notificaciones"""
    try:
        await notification_manager.notify_new_booking(booking_data)
        return {"message": "Simulación de nueva reserva enviada", "success": True}
    except Exception as e:
        logging.error(f"Error en simulación de nueva reserva: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@api_router.post("/simulate-booking-confirmed")  
async def simulate_booking_confirmed(data: dict):
    """Endpoint para simular confirmación de reserva y probar notificaciones"""
    try:
        await notification_manager.notify_booking_confirmed(
            user_id=data["user_id"],
            booking_data={"id": data["booking_id"]}
        )
        return {"message": "Simulación de confirmación enviada", "success": True}
    except Exception as e:
        logging.error(f"Error en simulación de confirmación: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()