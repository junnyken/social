import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

export function useCollaboration(documentId) {
  const { socket } = useSocket();
  const [content, setContent] = useState('');
  const [version, setVersion] = useState(0);
  const [editors, setEditors] = useState([]);
  const [cursorPositions, setCursorPositions] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const contentRef = useRef(content);
  const typingTimeoutRef = useRef(null);

  // Join document
  useEffect(() => {
    if (!socket || !documentId) return;

    socket.emit('join:document', { documentId });

    socket.on('document:state', (data) => {
      setContent(data.content);
      setVersion(data.version);
      setEditors(data.editors);
      contentRef.current = data.content;
    });

    socket.on('edit:change', (data) => {
      // Transform received operation against local changes
      applyRemoteChange(data);
    });

    socket.on('cursor:update', (data) => {
      setCursorPositions(prev => ({
        ...prev,
        [data.userId]: {
          position: data.position,
          selection: data.selection,
          color: data.color,
          email: data.email
        }
      }));
    });

    socket.on('editor:joined', (data) => {
      setEditors(prev => [...new Set([...prev, data.userId])]);
    });

    socket.on('editor:left', (data) => {
      setEditors(prev => prev.filter(id => id !== data.userId));
      setCursorPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[data.userId];
        return newPositions;
      });
    });

    return () => {
      socket.off('document:state');
      socket.off('edit:change');
      socket.off('cursor:update');
      socket.off('editor:joined');
      socket.off('editor:left');
    };

  }, [socket, documentId]);

  const applyRemoteChange = useCallback((data) => {
    const { operation, cursorPosition } = data;

    setContent(prev => {
      // Apply operation to content
      let newContent = prev;

      if (operation.type === 'insert') {
        newContent = (
          prev.slice(0, operation.position) +
          operation.content +
          prev.slice(operation.position)
        );
      } else if (operation.type === 'delete') {
        newContent = (
          prev.slice(0, operation.position) +
          prev.slice(operation.position + operation.content.length)
        );
      }

      contentRef.current = newContent;
      return newContent;
    });

    setVersion(data.version);
  }, []);

  const handleChange = useCallback((newContent) => {
    // Calculate operation
    const operation = calculateOperation(contentRef.current, newContent);

    if (!operation) return;

    setContent(newContent);
    contentRef.current = newContent;

    // Send to server
    socket?.emit('edit:change', {
      documentId,
      operation,
      cursorPosition: newContent.length,
      version
    });

    // Show typing indicator
    socket?.emit('typing:start', { documentId });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing:stop', { documentId });
    }, 1000);
  }, [socket, documentId, version]);

  const handleCursorMove = useCallback((position, selection) => {
    socket?.emit('cursor:move', {
      documentId,
      position,
      selection,
      color: generateUserColor(position)
    });
  }, [socket, documentId]);

  const handleSave = useCallback(() => {
    socket?.emit('document:save', {
      documentId,
      content,
      version
    });
  }, [socket, documentId, content, version]);

  return {
    content,
    version,
    editors,
    cursorPositions,
    handleChange,
    handleCursorMove,
    handleSave,
    isTyping
  };
}

function calculateOperation(oldContent, newContent) {
  if (oldContent === newContent) return null;

  if (newContent.length > oldContent.length) {
    // Insert operation
    for (let i = 0; i < oldContent.length; i++) {
      if (oldContent[i] !== newContent[i]) {
        return {
          type: 'insert',
          position: i,
          content: newContent.slice(i, i + (newContent.length - oldContent.length))
        };
      }
    }

    return {
      type: 'insert',
      position: oldContent.length,
      content: newContent.slice(oldContent.length)
    };
  } else {
    // Delete operation
    for (let i = 0; i < newContent.length; i++) {
      if (oldContent[i] !== newContent[i]) {
        return {
          type: 'delete',
          position: i,
          content: oldContent.slice(i, i + (oldContent.length - newContent.length))
        };
      }
    }

    return {
      type: 'delete',
      position: newContent.length,
      content: oldContent.slice(newContent.length)
    };
  }
}

function generateUserColor(seed) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#FFA07A', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E2', '#F8B88B'
  ];

  return colors[seed % colors.length];
}
