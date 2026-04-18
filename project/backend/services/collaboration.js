const redis = require('redis');
const { OperationalTransform, Operation } = require('./operational-transform');

const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.connect();

const otInstances = new Map();

class CollaborationService {
  /**
   * Get or create OT instance for document
   */
  static async getOTInstance(documentId) {
    if (!otInstances.has(documentId)) {
      // Load from Redis if exists
      const cached = await redisClient.get(`ot:${documentId}`);

      if (cached) {
        const state = JSON.parse(cached);
        const ot = new OperationalTransform();
        ot.serverContent = state.content;
        ot.serverVersion = state.version;
        otInstances.set(documentId, ot);
      } else {
        // Create new instance
        const ot = new OperationalTransform();
        otInstances.set(documentId, ot);
      }
    }

    return otInstances.get(documentId);
  }

  /**
   * Apply operation
   */
  static async applyOperation(documentId, operation) {
    const ot = await this.getOTInstance(documentId);

    const result = ot.applyLocal(operation);

    // Cache in Redis
    await redisClient.setEx(
      `ot:${documentId}`,
      3600,
      JSON.stringify({
        content: ot.serverContent,
        version: ot.serverVersion
      })
    );

    return result;
  }

  /**
   * Transform operation
   */
  static async transformOperation(
    documentId,
    clientOp,
    serverVersion
  ) {
    const ot = await this.getOTInstance(documentId);

    // Get operations since client version
    const laterOps = ot.getOperationsSince(serverVersion);

    // Transform client op against all later ops
    let transformedOp = clientOp;
    for (const laterOp of laterOps) {
      transformedOp = transformedOp.transform(laterOp);
    }

    return transformedOp;
  }

  /**
   * Save document version
   */
  static async saveVersion(documentId, content, userId) {
    const timestamp = new Date();
    const versionKey = `version:${documentId}:${timestamp.getTime()}`;

    await redisClient.setEx(
      versionKey,
      86400 * 7,  // 7 days
      JSON.stringify({
        content,
        userId,
        timestamp,
        checksum: this.calculateChecksum(content)
      })
    );

    // Add to version list
    await redisClient.lPush(
      `versions:${documentId}`,
      versionKey
    );
  }

  /**
   * Get document history
   */
  static async getHistory(documentId, limit = 50) {
    const versionKeys = await redisClient.lRange(
      `versions:${documentId}`,
      0,
      limit - 1
    );

    const versions = await Promise.all(
      versionKeys.map(async (key) => {
        const data = await redisClient.get(key);
        return JSON.parse(data);
      })
    );

    return versions;
  }

  /**
   * Calculate checksum for conflict detection
   */
  static calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Resolve conflicts
   */
  static async resolveConflict(documentId, version1, version2) {
    const history = await this.getHistory(documentId, 100);

    // Find common ancestor
    let commonAncestor = null;
    for (const version of history) {
      if (version.checksum === version1.checksum ||
          version.checksum === version2.checksum) {
        commonAncestor = version;
        break;
      }
    }

    if (!commonAncestor) {
      // Use most recent version
      return history[0];
    }

    // Apply 3-way merge algorithm
    const merged = this.threeWayMerge(
      commonAncestor.content,
      version1.content,
      version2.content
    );

    return merged;
  }

  /**
   * Simple 3-way merge
   */
  static threeWayMerge(base, version1, version2) {
    // Simple strategy: keep longest version
    if (version1.length > version2.length) {
      return version1;
    }
    return version2;
  }
}

module.exports = CollaborationService;
