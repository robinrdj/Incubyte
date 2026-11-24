import type { HrUserDto, SessionDto } from "@salary/shared";
import type { PrismaClient } from "../generated/prisma/client.js";
import { verifyPassword } from "../auth/passwords.js";
import { hashToken, newSessionToken } from "../auth/tokens.js";
import { toHrUserDto } from "./user-service.js";

const SESSION_HOURS = 12;

export class AuthService {
  constructor(
    private readonly db: PrismaClient,
    private readonly clock: () => Date,
  ) {}

  /** Returns a new session, or null when the email or password is wrong. */
  async signIn(email: string, password: string): Promise<SessionDto | null> {
    const user = await this.db.hrUser.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (user === null || !(await verifyPassword(password, user.passwordHash))) {
      return null;
    }

    const now = this.clock();
    const token = newSessionToken();
    const expiresAt = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);
    await this.db.$transaction([
      this.db.session.deleteMany({ where: { userId: user.id, expiresAt: { lte: now } } }),
      this.db.session.create({ data: { tokenHash: hashToken(token), userId: user.id, expiresAt } }),
    ]);
    return { token, expiresAt: expiresAt.toISOString(), user: toHrUserDto(user) };
  }

  /** The signed-in user for a token, or null when the token is unknown or expired. */
  async authenticate(token: string): Promise<HrUserDto | null> {
    const session = await this.db.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (session === null || session.expiresAt <= this.clock()) {
      return null;
    }
    return toHrUserDto(session.user);
  }

  async signOut(token: string): Promise<void> {
    await this.db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
}
