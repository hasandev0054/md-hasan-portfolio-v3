const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Message = require('../models/Message');
const AdminActivity = require('../models/AdminActivity');

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private/Admin
router.get('/dashboard', protect, adminOnly, async (req, res) => {
    try {
        // Get statistics
        const totalUsers = await User.countDocuments();
        const totalProjects = await Project.countDocuments();
        const totalMessages = await Message.countDocuments();
        const unreadMessages = await Message.countDocuments({ status: 'unread' });
        
        // Get recent activities
        const recentActivities = await AdminActivity.find()
            .sort({ timestamp: -1 })
            .limit(10)
            .lean();
        
        // Get recent messages
        const recentMessages = await Message.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        
        // Get recent projects
        const recentProjects = await Project.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        
        // Get user growth data (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const userGrowth = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
            }
        ]);
        
        res.json({
            status: 'success',
            data: {
                statistics: {
                    totalUsers,
                    totalProjects,
                    totalMessages,
                    unreadMessages
                },
                recentActivities,
                recentMessages,
                recentProjects,
                userGrowth
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        const total = await User.countDocuments();
        
        // Log activity
        await AdminActivity.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'view',
            resource: 'user',
            details: 'Viewed all users',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.json({
            status: 'success',
            data: {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private/Admin
router.put('/users/:id', protect, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Remove sensitive fields
        delete updates.password;
        delete updates.email; // Don't allow email change via this route
        
        const user = await User.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        
        // Log activity
        await AdminActivity.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'update',
            resource: 'user',
            resourceId: id,
            details: `Updated user ${user.name}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.json({
            status: 'success',
            message: 'User updated successfully',
            data: { user }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Don't allow self-deletion
        if (id === req.user.id) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot delete your own account'
            });
        }
        
        const user = await User.findByIdAndDelete(id);
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        
        // Log activity
        await AdminActivity.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'delete',
            resource: 'user',
            resourceId: id,
            details: `Deleted user ${user.name}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.json({
            status: 'success',
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

// @route   GET /api/admin/messages
// @desc    Get all messages
// @access  Private/Admin
router.get('/messages', protect, adminOnly, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const messages = await Message.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        const total = await Message.countDocuments();
        const unread = await Message.countDocuments({ status: 'unread' });
        
        res.json({
            status: 'success',
            data: {
                messages,
                statistics: {
                    total,
                    unread
                },
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

// @route   PUT /api/admin/messages/:id/read
// @desc    Mark message as read
// @access  Private/Admin
router.put('/messages/:id/read', protect, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        
        const message = await Message.findByIdAndUpdate(
            id,
            { status: 'read' },
            { new: true }
        );
        
        if (!message) {
            return res.status(404).json({
                status: 'error',
                message: 'Message not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Message marked as read',
            data: { message }
        });
    } catch (error) {
        console.error('Mark message read error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

// @route   POST /api/admin/messages/:id/reply
// @desc    Reply to message
// @access  Private/Admin
router.post('/messages/:id/reply', protect, adminOnly, [
    body('reply').notEmpty().withMessage('Reply message is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            errors: errors.array()
        });
    }
    
    try {
        const { id } = req.params;
        const { reply } = req.body;
        
        const message = await Message.findByIdAndUpdate(
            id,
            {
                status: 'replied',
                repliedAt: new Date(),
                replyMessage: reply
            },
            { new: true }
        );
        
        if (!message) {
            return res.status(404).json({
                status: 'error',
                message: 'Message not found'
            });
        }
        
        // In production, send email reply here
        
        res.json({
            status: 'success',
            message: 'Reply sent successfully',
            data: { message }
        });
    } catch (error) {
        console.error('Reply to message error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

// @route   GET /api/admin/projects
// @desc    Get all projects
// @access  Private/Admin
router.get('/projects', protect, adminOnly, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const projects = await Project.find()
            .populate('createdBy', 'name email')
            .sort({ order: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        const total = await Project.countDocuments();
        
        res.json({
            status: 'success',
            data: {
                projects,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

// @route   POST /api/admin/projects
// @desc    Create new project
// @access  Private/Admin
router.post('/projects', protect, adminOnly, [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            errors: errors.array()
        });
    }
    
    try {
        const projectData = {
            ...req.body,
            createdBy: req.user._id
        };
        
        const project = await Project.create(projectData);
        
        // Log activity
        await AdminActivity.create({
            adminId: req.user._id,
            adminName: req.user.name,
            action: 'create',
            resource: 'project',
            resourceId: project._id,
            details: `Created project: ${project.title}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        res.status(201).json({
            status: 'success',
            message: 'Project created successfully',
            data: { project }
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

// @route   GET /api/admin/activities
// @desc    Get admin activities
// @access  Private/Admin
router.get('/activities', protect, adminOnly, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        const activities = await AdminActivity.find()
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        const total = await AdminActivity.countDocuments();
        
        res.json({
            status: 'success',
            data: {
                activities,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

module.exports = router;