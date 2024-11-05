import { sign, verify } from "jsonwebtoken";
import { compare } from "bcryptjs";
import { User } from "@/entities/User";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function createToken(user: User) {
  return sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
}

export async function verifyToken(token: string) {
  try {
    const decoded = verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.log(error)
    return null;
  }
}

export async function validatePassword(user: User, password: string) {
  return compare(password, user.password);
}