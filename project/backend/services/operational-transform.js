/**
 * Operational Transform (OT) Implementation
 * Handles conflict resolution for collaborative editing
 */

class Operation {
  constructor(type, position, content = '') {
    this.type = type;  // 'insert' or 'delete'
    this.position = position;
    this.content = content;
    this.timestamp = Date.now();
  }

  /**
   * Apply operation to content
   */
  apply(content) {
    if (this.type === 'insert') {
      return (
        content.slice(0, this.position) +
        this.content +
        content.slice(this.position)
      );
    } else if (this.type === 'delete') {
      return (
        content.slice(0, this.position) +
        content.slice(this.position + this.content.length)
      );
    }
    return content;
  }

  /**
   * Get inverse operation
   */
  getInverse() {
    if (this.type === 'insert') {
      return new Operation('delete', this.position, this.content);
    } else if (this.type === 'delete') {
      return new Operation('insert', this.position, this.content);
    }
  }

  /**
   * Transform against another operation
   */
  transform(other) {
    // If operations don't overlap, return as is
    if (
      (this.type === 'insert' && other.type === 'insert') ||
      (this.type === 'delete' && other.type === 'delete')
    ) {
      if (this.position < other.position) {
        return this;
      } else if (this.position > other.position) {
        const newOp = new Operation(this.type, this.position, this.content);

        if (other.type === 'insert') {
          newOp.position += other.content.length;
        } else {
          newOp.position -= other.content.length;
        }

        return newOp;
      } else {
        // Same position - use timestamps to break tie
        if (this.timestamp < other.timestamp) {
          return this;
        } else {
          const newOp = new Operation(this.type, this.position, this.content);
          if (other.type === 'insert') {
            newOp.position += other.content.length;
          } else {
            newOp.position -= other.content.length;
          }
          return newOp;
        }
      }
    }

    // Insert vs Delete
    if (this.type === 'insert' && other.type === 'delete') {
      const newOp = new Operation(this.type, this.position, this.content);

      if (this.position <= other.position) {
        // Insert before delete
        return newOp;
      } else if (
        this.position >
        other.position + other.content.length
      ) {
        // Insert after delete
        newOp.position -= other.content.length;
        return newOp;
      } else {
        // Insert inside delete range
        newOp.position = other.position;
        return newOp;
      }
    }

    // Delete vs Insert
    if (this.type === 'delete' && other.type === 'insert') {
      const newOp = new Operation(this.type, this.position, this.content);

      if (this.position + this.content.length <= other.position) {
        // Delete before insert
        return newOp;
      } else if (this.position >= other.position) {
        // Delete after insert
        newOp.position += other.content.length;
        return newOp;
      } else {
        // Delete spans insert point
        newOp.content = newOp.content.slice(
          0,
          other.position - this.position
        );
        return newOp;
      }
    }

    return this;
  }
}

class OperationalTransform {
  constructor() {
    this.serverContent = '';
    this.serverVersion = 0;
    this.operations = [];
    this.pendingOperations = [];
  }

  /**
   * Apply local operation
   */
  applyLocal(operation) {
    this.serverContent = operation.apply(this.serverContent);
    this.operations.push(operation);
    this.serverVersion++;

    return {
      version: this.serverVersion,
      content: this.serverContent
    };
  }

  /**
   * Apply remote operation
   */
  applyRemote(remoteOp, remoteVersion) {
    // Transform pending operations against remote operation
    this.pendingOperations = this.pendingOperations.map(pending =>
      pending.transform(remoteOp)
    );

    // Apply remote operation
    this.serverContent = remoteOp.apply(this.serverContent);
    this.operations.push(remoteOp);
    this.serverVersion++;

    return {
      version: this.serverVersion,
      content: this.serverContent
    };
  }

  /**
   * Get operations since version
   */
  getOperationsSince(version) {
    if (version < 0 || version >= this.operations.length) {
      return [];
    }

    return this.operations.slice(version);
  }

  /**
   * Undo last local operation
   */
  undo() {
    if (this.pendingOperations.length === 0) {
      return null;
    }

    const lastOp = this.pendingOperations.pop();
    const inverse = lastOp.getInverse();

    this.serverContent = inverse.apply(this.serverContent);

    return {
      operation: inverse,
      version: this.serverVersion,
      content: this.serverContent
    };
  }

  /**
   * Get current state
   */
  getState() {
    return {
      content: this.serverContent,
      version: this.serverVersion,
      operationsCount: this.operations.length
    };
  }
}

module.exports = { Operation, OperationalTransform };
