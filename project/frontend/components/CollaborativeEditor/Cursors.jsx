import React, { useMemo } from 'react';

export default function RemoteCursors({ cursorPositions, content }) {
  const cursors = useMemo(() => {
    // Only map if custom cursors is deeply embedded inside text
    return Object.entries(cursorPositions).map(([userId, cursor]) => {
      // Note: mapping complex text node metrics is generalized here
      const lineNum = content.substring(0, cursor.position).split('\n').length - 1;
      const lineStart = content.lastIndexOf('\n', cursor.position - 1) + 1;
      const charNum = cursor.position - lineStart;

      return {
        userId,
        lineNum,
        charNum,
        ...cursor
      };
    });
  }, [cursorPositions, content]);

  return (
    <div style={styles.cursorsContainer}>
      {cursors.map((cursor) => (
        <div key={cursor.userId} style={styles.cursorWrapper}>
          <div
            style={{
              ...styles.cursor,
              borderLeftColor: cursor.color
            }}
          />
          <span style={{
            ...styles.label,
            background: cursor.color
          }}>
            {cursor.email}
          </span>
        </div>
      ))}
    </div>
  );
}

const styles = {
  cursorsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    width: '100%',
    height: '100%'
  },

  cursorWrapper: {
    position: 'absolute'
  },

  cursor: {
    width: '2px',
    height: '20px',
    borderLeft: '2px solid',
    animation: 'blink 1s infinite'
  },

  label: {
    position: 'absolute',
    top: '-20px',
    left: 0,
    padding: '2px 6px',
    fontSize: '11px',
    color: 'white',
    borderRadius: '2px',
    whiteSpace: 'nowrap'
  }
};
