import jsonwebtoken from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { User } from "@/entities/User";
import dotenv from 'dotenv';
import { JwtPayload } from 'jsonwebtoken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const { sign, verify } = jsonwebtoken;

export interface CustomJwtPayload extends JwtPayload {
  userId: number;
}

export async function createToken(user: User) {
  // Type assertion to tell TypeScript that JWT_SECRET is definitely a string
  const secret = JWT_SECRET as string;
  return sign({ userId: user.id }, secret, { expiresIn: "7d" });
}

export async function verifyToken(token: string) {
  try {
    const secret = JWT_SECRET as string;
    const decoded = verify(token, secret);
    return decoded;
  } catch (error) {
    console.log(error)
    return null;
  }
}

export async function validatePassword(user: User, password: string) {
  return bcryptjs.compare(password, user.password);
}