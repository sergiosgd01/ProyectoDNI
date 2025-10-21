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

// Rutas
app.get('/', (req, res) => res.send('✅ API de DNI funcionando correctamente'));
app.use('/api/dni', dniRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI no está definido en el entorno');
    }

    console.log(`Conectando a MongoDB: ${process.env.MONGO_URI}`);
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log('✅ MongoDB conectado');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al conectar MongoDB', error);
    process.exit(1);
  }
}

startServer();
