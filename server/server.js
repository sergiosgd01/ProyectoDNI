import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import dniRoutes from './routes/dni.js';
import morgan from 'morgan';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Error al conectar MongoDB', err));

// Rutas
app.get('/', (req, res) => res.send('✅ API de DNI funcionando correctamente'));
app.use('/api/dni', dniRoutes); // 👈 esta línea activa /api/dni/save, /api/dni/:dniNumber, etc.

// Puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
