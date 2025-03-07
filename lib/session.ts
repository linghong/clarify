import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { initializeDatabase } from "@/lib/db";
import { User } from "@/entities/User";

// Get the current user from the JWT token in cookies
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };

    const dataSource = await initializeDatabase();
    const userRepository = dataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: decoded.userId }
    });

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
} 