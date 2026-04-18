import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={styles.container}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.button}
      >
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.header}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={styles.markAllBtn}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={styles.list}>
            {notifications.length === 0 ? (
              <p style={styles.empty}>No notifications</p>
            ) : (
              notifications.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={() => markAsRead(n.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification, onRead }) {
  return (
    <div
      style={{
        ...styles.item,
        background: notification.read ? 'white' : '#f0f0f0'
      }}
      onClick={onRead}
    >
      <div style={styles.icon}>
        {notification.type === 'comment_added' && '💬'}
        {notification.type === 'mention' && '👤'}
        {notification.type === 'post_published' && '📝'}
        {notification.type === 'collaboration_invite' && '🤝'}
      </div>

      <div style={styles.content}>
        <p style={styles.title}>{notification.title}</p>
        <p style={styles.message}>{notification.message}</p>
        <small style={styles.time}>
          {new Date(notification.createdAt).toLocaleDateString()}
        </small>
      </div>

      {!notification.read && (
        <div style={styles.unreadDot} />
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'relative'
  },

  button: {
    position: 'relative',
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer'
  },

  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    background: '#e74c3c',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold'
  },

  dropdown: {
    position: 'absolute',
    top: '40px',
    right: '0',
    width: '350px',
    background: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: '1000'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #eee'
  },

  markAllBtn: {
    background: 'none',
    border: 'none',
    color: '#01696f',
    cursor: 'pointer',
    fontSize: '12px'
  },

  list: {
    maxHeight: '400px',
    overflowY: 'auto'
  },

  item: {
    display: 'flex',
    gap: '10px',
    padding: '12px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },

  icon: {
    fontSize: '20px'
  },

  content: {
    flex: 1
  },

  title: {
    margin: '0 0 4px 0',
    fontWeight: '600',
    fontSize: '13px'
  },

  message: {
    margin: '0',
    fontSize: '12px',
    color: '#666'
  },

  time: {
    color: '#999',
    fontSize: '11px'
  },

  unreadDot: {
    width: '8px',
    height: '8px',
    background: '#01696f',
    borderRadius: '50%'
  },

  empty: {
    textAlign: 'center',
    padding: '20px',
    color: '#999'
  }
};
