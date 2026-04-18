import React, { useState, useEffect } from 'react';
import { useSocket } from '../../hooks/useSocket';

export default function CommentThread({ documentId, comments: initialComments }) {
  const { socket } = useSocket();
  const [comments, setComments] = useState(initialComments || []);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (!socket) return;

    socket.on('comment:added', (comment) => {
      setComments(prev => [comment, ...prev]);
    });

    socket.on('comment:replied', (data) => {
      setComments(prev => prev.map(c =>
        c._id === data.commentId ? { ...c, replies: [...c.replies, data.reply] } : c
      ));
    });

    socket.on('reaction:added', (data) => {
      setComments(prev => prev.map(c =>
        c._id === data.commentId ? { ...c } : c
      ));
    });

    return () => {
      socket.off('comment:added');
      socket.off('comment:replied');
      socket.off('reaction:added');
    };

  }, [socket]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          documentId,
          text: newComment
        })
      });

      if (response.ok) {
        setNewComment('');
      }

    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>💬 Comments ({comments.length})</h3>

      <div style={styles.input}>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          style={styles.textarea}
        />
        <button
          onClick={handleAddComment}
          style={styles.submitBtn}
        >
          Send
        </button>
      </div>

      <div style={styles.comments}>
        {comments.map(comment => (
          <CommentItem
            key={comment._id}
            comment={comment}
            documentId={documentId}
          />
        ))}
      </div>
    </div>
  );
}

function CommentItem({ comment, documentId }) {
  const [showReplies, setShowReplies] = useState(false);

  return (
    <div style={styles.commentItem}>
      <div style={styles.commentHeader}>
        <strong>{comment.userId?.name}</strong>
        <span style={styles.time}>
          {new Date(comment.createdAt).toLocaleDateString()}
        </span>
      </div>

      <p style={styles.text}>{comment.text}</p>

      <div style={styles.reactions}>
        {comment.reactions.map(reaction => (
          <button
            key={reaction.emoji}
            style={styles.reactionBtn}
          >
            {reaction.emoji} {reaction.userIds.length}
          </button>
        ))}
      </div>

      {comment.replies.length > 0 && (
        <div style={styles.repliesSection}>
          <button
            onClick={() => setShowReplies(!showReplies)}
            style={styles.repliesToggle}
          >
            {showReplies ? '🔽' : '▶️'} {comment.replies.length} replies
          </button>

          {showReplies && (
            <div style={styles.replies}>
              {comment.replies.map((reply, i) => (
                <div key={i} style={styles.reply}>
                  <strong>{reply.userId?.name}:</strong> {reply.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '300px',
    borderLeft: '1px solid #ddd',
    padding: '20px',
    overflowY: 'auto'
  },

  title: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '15px'
  },

  input: {
    marginBottom: '20px'
  },

  textarea: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    marginBottom: '8px',
    resize: 'vertical',
    minHeight: '60px'
  },

  submitBtn: {
    width: '100%',
    padding: '6px',
    background: '#01696f',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },

  comments: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },

  commentItem: {
    padding: '10px',
    background: '#f9f9f9',
    borderRadius: '4px',
    fontSize: '12px'
  },

  commentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },

  time: {
    color: '#999',
    fontSize: '11px'
  },

  text: {
    margin: '8px 0',
    lineHeight: '1.4'
  },

  reactions: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px'
  },

  reactionBtn: {
    padding: '2px 6px',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '3px',
    fontSize: '11px',
    cursor: 'pointer'
  }
};
