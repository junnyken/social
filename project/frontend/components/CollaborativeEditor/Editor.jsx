import React, { useRef, useState } from 'react';
import { useCollaboration } from '../../hooks/useCollaboration';
import RemoteCursors from './Cursors';
import EditorPresence from './Presence';
import Comments from './Comments';

export default function CollaborativeEditor({ documentId, onSave }) {
  const editorRef = useRef(null);
  const [showComments, setShowComments] = useState(false);

  const {
    content,
    version,
    editors,
    cursorPositions,
    handleChange,
    handleCursorMove,
    handleSave
  } = useCollaboration(documentId);

  const handleTextChange = (e) => {
    handleChange(e.target.value);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowComments(!showComments);
    }
  };

  const handleMouseUp = () => {
    const editor = editorRef.current;
    const position = editor.selectionStart;
    const selection = {
      start: editor.selectionStart,
      end: editor.selectionEnd
    };

    handleCursorMove(position, selection);
  };

  return (
    <div style={styles.container}>
      <EditorPresence editors={editors} />

      <div style={styles.editorWrapper}>
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onMouseUp={handleMouseUp}
          style={styles.editor}
          placeholder="Start typing..."
        />

        <RemoteCursors
          cursorPositions={cursorPositions}
          content={content}
        />
      </div>

      {showComments && (
        <Comments documentId={documentId} />
      )}

      <div style={styles.footer}>
        <span>v{version}</span>
        <button
          onClick={handleSave}
          style={styles.saveBtn}
        >
          💾 Save
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#fff'
  },

  editorWrapper: {
    position: 'relative',
    flex: 1,
  },

  editor: {
    width: '100%',
    height: '100%',
    padding: '20px',
    border: 'none',
    fontFamily: 'Monaco, monospace',
    fontSize: '14px',
    lineHeight: '1.6',
    resize: 'none',
    outline: 'none'
  },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    borderTop: '1px solid #eee',
    fontSize: '12px',
    color: '#666'
  },

  saveBtn: {
    padding: '6px 12px',
    background: '#01696f',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};
