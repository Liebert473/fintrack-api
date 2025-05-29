import express from 'express';
const router = express.Router();
import connectDB from '../db.js';
import { ObjectId } from 'mongodb';
import authenticateToken from './auth/authMiddleware.js';

// GET all notifications
router.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const userId = new ObjectId(req.user.id);
        const notifications = await db.collection('notifications')
            .find({ user: userId })
            .sort({ createdAt: -1 })
            .toArray();

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// GET unread notifications count
router.get('/api/notifications/unread', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const userId = new ObjectId(req.user.id);
        const count = await db.collection('notifications')
            .countDocuments({ user: userId, isRead: false });

        res.json({ count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// MARK single notification as read
router.put('/api/notifications/read/:id', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        await db.collection('notifications').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { isRead: true } }
        );
        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// MARK all notifications as read
router.put('/api/notifications/readAll', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const userId = new ObjectId(req.user.id);

        await db.collection('notifications').updateMany(
            { user: userId },
            { $set: { isRead: true } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

// DELETE notification
router.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        await db.collection('notifications').deleteOne({
            _id: new ObjectId(req.params.id)
        });
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Add notification utility
export async function addNotification(message, userId) {
    const db = await connectDB();
    await db.collection('notifications').insertOne({
        message,
        user: new ObjectId(userId),
        isRead: false,
        createdAt: new Date()
    });
}

export default router;
