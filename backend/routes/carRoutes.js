import express from 'express';
import { createCar, deleteCar, getCarById, getCars, updateCar } from '../controllers/carController.js';
import { uploads } from '../middlewares/uploads.js';
import adminAuth from '../middlewares/adminAuth.js';



const carRouter = express.Router();

carRouter.get('/', getCars);
carRouter.get('/:id', getCarById);
carRouter.post('/', adminAuth, uploads.single('image'), createCar);

carRouter.put('/:id', adminAuth, uploads.single('image'), updateCar);
carRouter.delete('/:id', adminAuth, deleteCar);

export default carRouter;