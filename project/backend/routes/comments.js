const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const { verifyToken } = require('../middleware');
const { getIO } = require('../config/socket');

// Create comment
router.post('/', verifyToken, async (req, res) => {
  try {
    const { documentId, text, position } = req.body;

    const comment = new Comment({
      documentId,
      userId: req.user.id,
      text,
      position
    });

    await comment.save();
    await comment.populate('userId', 'name email');

    // Broadcast to all editors
    const io = getIO();
    io.to(`doc:${documentId}`).emit('comment:added', comment);

    res.status(201).json(comment);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get comments for document
router.get('/:documentId', verifyToken, async (req, res) => {
  try {
    const comments = await Comment.find({
      documentId: req.params.documentId
    })
      .populate('userId', 'name email avatar')
      .populate('replies.userId', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json(comments);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add reply
router.post('/:commentId/reply', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.replies.push({
      userId: req.user.id,
      text
    });

    await comment.save();

    // Broadcast
    const io = getIO();
    io.to(`doc:${comment.documentId}`).emit('comment:replied', {
      commentId: req.params.commentId,
      reply: comment.replies[comment.replies.length - 1]
    });

    res.json(comment);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add reaction
router.post('/:commentId/reaction', verifyToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reaction = comment.reactions.find(r => r.emoji === emoji);

    if (reaction) {
      if (!reaction.userIds.includes(req.user.id)) {
        reaction.userIds.push(req.user.id);
      }
    } else {
      comment.reactions.push({
        emoji,
        userIds: [req.user.id]
      });
    }

    await comment.save();

    // Broadcast
    const io = getIO();
    io.to(`doc:${comment.documentId}`).emit('reaction:added', {
      commentId: req.params.commentId,
      userId: req.user.id,
      emoji
    });

    res.json(comment);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Resolve comment
router.patch('/:commentId/resolve', verifyToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.resolved = !comment.resolved;
    await comment.save();

    // Broadcast
    const io = getIO();
    io.to(`doc:${comment.documentId}`).emit('comment:resolved', {
      commentId: req.params.commentId,
      resolved: comment.resolved
    });

    res.json(comment);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
