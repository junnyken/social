const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { verifyToken, rbacMiddleware } = require('../middleware');

/**
 * GET /api/posts
 * List all posts for workspace
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { workspaceId, status, page = 1, limit = 20 } = req.query;

    const query = {
      workspaceId,
      deletedAt: null
    };

    if (status) query.status = status;

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('userId', 'name email');

    const total = await Post.countDocuments(query);

    res.json({
      data: posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/posts
 * Create new post
 */
router.post('/', verifyToken, rbacMiddleware('content:create'), async (req, res) => {
  try {
    const { text, platforms, mediaUrls, scheduledAt, workspaceId } = req.body;

    // Validation
    if (!text || !platforms || platforms.length === 0) {
      return res.status(400).json({ message: 'Text and platforms required' });
    }

    const post = new Post({
      userId: req.user.id,
      workspaceId,
      text,
      platforms: platforms.map(p => ({
        platform: p.platform,
        accountId: p.accountId,
        accountHandle: p.accountHandle,
        status: 'pending'
      })),
      mediaUrls,
      scheduledAt,
      status: scheduledAt ? 'scheduled' : 'draft'
    });

    await post.save();

    res.status(201).json(post);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * GET /api/posts/:id
 * Get single post
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/posts/:id
 * Update post
 */
router.patch('/:id', verifyToken, rbacMiddleware('content:edit'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check ownership
    if (post.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Only draft/scheduled posts can be edited
    if (!['draft', 'scheduled'].includes(post.status)) {
      return res.status(400).json({ message: 'Cannot edit published posts' });
    }

    Object.assign(post, req.body);
    post.updatedAt = new Date();

    await post.save();

    res.json(post);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * DELETE /api/posts/:id
 * Delete post
 */
router.delete('/:id', verifyToken, rbacMiddleware('content:delete'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.deletedAt = new Date();
    await post.save();

    res.json({ message: 'Post deleted' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/posts/:id/publish
 * Publish post to social media
 */
router.post('/:id/publish', verifyToken, rbacMiddleware('content:publish'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Publish to each platform
    const publishPromises = post.platforms.map(async (platform) => {
      try {
        // Call appropriate social media API
        const result = await publishToSocialMedia(
          platform.platform,
          post,
          platform.accountId
        );

        platform.nativePostId = result.postId;
        platform.publishedAt = new Date();
        platform.status = 'published';

      } catch (error) {
        platform.status = 'failed';
        console.error(`Failed to publish to ${platform.platform}:`, error);
      }
    });

    await Promise.all(publishPromises);

    post.publishedAt = new Date();
    post.status = 'published';

    await post.save();

    res.json(post);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

async function publishToSocialMedia(platform, post, accountId) {
  // Implementation for each platform
  // This would integrate with Instagram, Facebook, Twitter, LinkedIn APIs
  switch(platform) {
    case 'instagram':
      return publishToInstagram(post, accountId);
    case 'facebook':
      return publishToFacebook(post, accountId);
    case 'twitter':
      return publishToTwitter(post, accountId);
    case 'linkedin':
      return publishToLinkedIn(post, accountId);
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

module.exports = router;
