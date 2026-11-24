import type { HrUserDto } from "@salary/shared";
import { Prisma, type HrUser, type PrismaClient } from "../generated/prisma/client.js";
import { hashPassword } from "../auth/passwords.js";
import { conflict } from "../http/errors.js";
import type { CreateHrUserInput } from "../http/schemas.js";

export function toHrUserDto(user: HrUser): HrUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    createdBy: user.createdBy,
  };
}

export class UserService {
  constructor(private readonly db: PrismaClient) {}

  async list(): Promise<HrUserDto[]> {
    const users = await this.db.hrUser.findMany({ orderBy: { createdAt: "asc" } });
    return users.map(toHrUserDto);
  }

  async create(input: CreateHrUserInput, createdBy: string): Promise<HrUserDto> {
    try {
      const user = await this.db.hrUser.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: await hashPassword(input.password),
          createdBy,
        },
      });
      return toHrUserDto(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw conflict(`An HR user with the email ${input.email} already exists`);
      }
      throw error;
    }
  }

  /** Creates the first account from configuration; does nothing once any exists. */
  async ensureInitialUser(email: string, password: string): Promise<void> {
    if ((await this.db.hrUser.count()) > 0) return;
    await this.db.hrUser.create({
      data: { name: "HR Manager", email, passwordHash: await hashPassword(password) },
    });
  }
}
