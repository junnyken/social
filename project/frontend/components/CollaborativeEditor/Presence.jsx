import React from 'react';

export default function EditorPresence({ editors }) {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <span style={styles.label}>
          👥 {editors.length} editing:
        </span>
        <div style={styles.avatars}>
          {editors.slice(0, 3).map((editor, i) => (
            <div
              key={editor}
              style={{
                ...styles.avatar,
                background: `hsl(${i * 120}, 70%, 60%)`
              }}
            >
              {editor.charAt(0).toUpperCase()}
            </div>
          ))}
          {editors.length > 3 && (
            <div style={styles.moreCount}>
              +{editors.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: '#f5f5f5',
    padding: '10px 20px',
    borderBottom: '1px solid #ddd'
  },

  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },

  label: {
    fontSize: '13px',
    fontWeight: '600'
  },

  avatars: {
    display: 'flex',
    gap: '-5px'
  },

  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    marginLeft: '-5px',
    border: '2px solid white'
  },

  moreCount: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    marginLeft: '10px'
  }
};
