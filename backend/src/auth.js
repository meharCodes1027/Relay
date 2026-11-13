import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const TOKEN_EXPIRY = "7d";

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return jwt.sign({ sub: userId }, secret, { expiresIn: TOKEN_EXPIRY });
}

export function requireAuth({ User, Membership }) {
  return async (request, response, next) => {
    try {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
      if (!token) {
        response.status(401).json({ error: "Authentication required" });
        return;
      }
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET is required");
      const payload = jwt.verify(token, secret);
      const user = await User.findById(payload.sub).select("_id email name").lean();
      if (!user) {
        response.status(401).json({ error: "Authentication required" });
        return;
      }
      request.user = user;
      request.workspaceId = request.headers["x-workspace-id"];
      if (!request.workspaceId) {
        const membership = await Membership.findOne({ user: user._id }).select("workspace role").lean();
        if (membership) {
          request.workspaceId = membership.workspace.toString();
          request.membership = membership;
        }
      }
      if (request.workspaceId) {
        const membership = request.membership ?? await Membership.findOne({
          user: user._id,
          workspace: request.workspaceId
        }).lean();
        if (!membership) {
          response.status(403).json({ error: "Workspace access denied" });
          return;
        }
        request.membership = membership;
      }
      next();
    } catch (error) {
      if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
        response.status(401).json({ error: "Authentication required" });
        return;
      }
      next(error);
    }
  };
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.membership || !roles.includes(request.membership.role)) {
      response.status(403).json({ error: "Insufficient workspace permissions" });
      return;
    }

    next();
  };
}

export function requireWorkspace(request, response, next) {
  if (!request.workspaceId) {
    response.status(400).json({ error: "Workspace selection is required" });
    return;
  }
  if (!request.membership) {
    response.status(403).json({ error: "Workspace access denied" });
    return;
  }
  next();
}
