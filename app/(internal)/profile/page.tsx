"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/app/(internal)/components/Header";

enum EducationLevel {
  HIGH_SCHOOL = "high_school",
  COLLEGE = "college",
  MASTERS = "masters",
  PHD = "phd",
  OTHER = "other"
}

interface UserData {
  id: number;
  email: string;
  name: string | null;
  educationLevel?: EducationLevel;
  major?: string;
  description?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('');
  const [major, setMajor] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Authentication failed");
        }

        const data = await response.json();
        setUserData(data.user);
        setEducationLevel(data.user.educationLevel || '');
        setMajor(data.user.major || '');
        setDescription(data.user.description || '');
      } catch (error) {
        console.error("Auth error:", error);
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          educationLevel,
          major: educationLevel === EducationLevel.HIGH_SCHOOL ? null : major,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const data = await response.json();
      setUserData(data.user);
      setIsEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        title="Profile"
        userName={userData?.name || userData?.email || ''}
        currentPage="profile"
      />

      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium mb-6">Your Profile</h2>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="mt-1 text-sm text-gray-900">{userData?.email}</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Education Level
                  </label>
                  <Select value={educationLevel} onValueChange={(value: EducationLevel) => setEducationLevel(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EducationLevel.HIGH_SCHOOL}>High School</SelectItem>
                      <SelectItem value={EducationLevel.COLLEGE}>College</SelectItem>
                      <SelectItem value={EducationLevel.MASTERS}>Masters</SelectItem>
                      <SelectItem value={EducationLevel.PHD}>PhD</SelectItem>
                      <SelectItem value={EducationLevel.OTHER}>Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {educationLevel && educationLevel !== EducationLevel.HIGH_SCHOOL && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Major
                    </label>
                    <Input
                      type="text"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      className="mt-1"
                      placeholder="Enter your major"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    About You
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1"
                    rows={4}
                    placeholder="Tell us about yourself, your interests, and your goals..."
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-lg">{userData?.name || userData?.email || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Education Level</label>
                  <p className="mt-1 text-lg">{userData?.educationLevel?.replace('_', ' ').toLowerCase()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ') || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Major</label>
                  <p className="mt-1 text-lg">{userData?.major || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-lg">{userData?.description || 'Not specified'}</p>
                </div>
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}