import jwt from 'jsonwebtoken';
import connectDB from '../../db.js';
import dotenv from 'dotenv'
import { ObjectId } from 'mongodb';

dotenv.config()

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token required' });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const db = await connectDB()
        const user = await db.collection('users').findOne({ _id: new ObjectId(payload.userId) });

        if (!user) {
            return res.status(401).json({ error: 'User does not exist' });
        }

        req.user = { id: new ObjectId(user._id) };
        next();
    } catch (err) {
        return res.status(403).json({ error: `Login expired or invaild. ${err}` });
    }
}

export default authenticateToken
