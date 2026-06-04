import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import path from 'path';
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const envPath = path.resolve(__dirname, `../${envFile}`);
dotenv.config({ path: envPath });

import http from 'http';
import { Server } from 'socket.io';
import prisma from './prisma';

// Routes
import authRoutes from './routes/authRoutes';
import ticketRoutes from './routes/ticketRoutes';
import userRoutes from './routes/userRoutes';
import teamRoutes from './routes/teamRoutes';
import departmentRoutes from './routes/departmentRoutes';
import noticeRoutes from './routes/noticeRoutes';
import notificationRoutes from './routes/notificationRoutes';
import chatRoutes from './routes/chatRoutes';
import commonRoutes from './routes/commonRoutes';
import roleRoutes from './routes/roleRoutes';
import requestRoutes from './routes/requestRoutes';
import timesheetRoutes from './routes/timesheetRoutes';
import candidateRoutes from './routes/candidateRoutes';
import interviewRoutes from './routes/interviewRoutes';
import projectRoutes from './routes/projectRoutes';
import announcementRoutes from './routes/announcementRoutes';

// Swagger & Socket
import { setupSwagger } from './swagger';
import { setupSocketEvents } from './socketio/events';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

const PORT = process.env.PORT || 4000;

app.use(cors());
// Large limit to accommodate base64-encoded image attachments on tickets and
// comments (up to 5 images × 2MB binary ≈ 13.3MB base64 per payload).
app.use(express.json({ limit: "20mb" }));

// Swagger
setupSwagger(app);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', chatRoutes);
app.use('/api/common', commonRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/announcements', announcementRoutes);

// Root → Swagger
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Socket.io
setupSocketEvents(io);

// Start Server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export { app, io, prisma };
 
