import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import http from 'http'

import path from 'path';
import helmet from 'helmet';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import userRouter from './routes/userRoutes.js';
import carRouter from './routes/carRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import chatRouter from './routes/chatRoutes.js';
import adminAuthRouter from './routes/adminAuthRoutes.js';
import reportRouter from './routes/reportRoutes.js';
// GPS system disabled
// import gpsRouter from './routes/gpsRoutes.js';
import { initSocketServer } from './utils/socket.js';
import { initScheduler } from './utils/reminderScheduler.js';

dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialization function to ensure DB connects before other services start
const startApp = async () => {
    try {
        await connectDB();
        initScheduler();
        initSocketServer(httpServer);

        httpServer.listen(PORT, "0.0.0.0", () => {
            console.log(`SERVER RUNNING ON http://localhost:${PORT}`)
        })
    } catch (error) {
        console.error("Initialization failed:", error);
        process.exit(1); // Exit if DB connection fails
    }
};

startApp();

//MIDDLEWARES
const corsOptions = {
    origin: function(origin, callback) {
        const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'cache-control', 'pragma', 'expires', 'x-requested-with', 'accept', 'origin'],
    exposedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials', 'Content-Disposition', 'Content-Type', 'Content-Length'],
    optionsSuccessStatus: 200,
    maxAge: 86400
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, cache-control, pragma, expires, x-requested-with, accept, origin');
    res.setHeader('Access-Control-Expose-Headers', 'Access-Control-Allow-Origin, Access-Control-Allow-Credentials, Content-Disposition, Content-Type, Content-Length');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin'},
    })
)
app.use(express.json());
app.use(express.urlencoded({ extended: true}))

app.use(
    '/uploads', (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', "*");
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    },
    express.static(path.join(process.cwd(), 'uploads'))
)
app.use('/api/auth', userRouter );
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/reports', reportRouter);
app.use('/api/cars', carRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/chats', chatRouter);
// GPS system disabled
// app.use('/api/gps', gpsRouter);

app.get('/api/ping', (req, res) => res.json({
    ok: true,
    time: Date.now()
}))


//LISTEN
app.get('/', (req, res) => {
    res.send('API WORKING')
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || "Internal Server Error" });
});

process.on("uncaughtException", err => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", err => {
  console.error("UNHANDLED REJECTION:", err);
});
