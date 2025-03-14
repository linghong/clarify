"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  age: number | null;
  educationLevel?: EducationLevel;
  major?: string;
  description?: string;
  gender?: string;
  jobTitle?: string;
  yearsOfExperience?: string;
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
  const [gender, setGender] = useState('');
  const [age, setAge] = useState<number | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
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
        setGender(data.user.gender || '');
        setAge(data.user.age || null);
        setJobTitle(data.user.jobTitle || '');
        setYearsOfExperience(data.user.yearsOfExperience || '');
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
          gender,
          age,
          jobTitle,
          yearsOfExperience
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
    <div className="min-h-screen bg-background">
      <main className="py-6">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Header Section */}
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">Your Profile</h2>
            </div>

            {/* Content Section */}
            <div className="px-6 py-6">
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <Input
                        type="text"
                        value={userData?.name || ''}
                        disabled
                        className="mt-1 w-full bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">
                        {userData?.email}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Gender
                      </label>
                      <Input
                        type="text"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="mt-1 w-full"
                        placeholder="Enter your gender"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Age
                      </label>
                      <Input
                        type="number"
                        value={age || ''}
                        onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="mt-1 w-full"
                        placeholder="Enter your age"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Education Level
                    </label>
                    <Select
                      value={educationLevel}
                      onValueChange={(value: EducationLevel) => setEducationLevel(value)}
                    >
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EducationLevel.HIGH_SCHOOL}>High School</SelectItem>
                        <SelectItem value={EducationLevel.COLLEGE}>College</SelectItem>
                        <SelectItem value={EducationLevel.MASTERS}>Master</SelectItem>
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
                        className="mt-1 w-full"
                        placeholder="Enter your major"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Your Job Title
                      </label>
                      <Input
                        type="text"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="mt-1 w-full"
                        placeholder="Enter your job title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Years of Experience
                      </label>
                      <Input
                        type="text"
                        value={yearsOfExperience}
                        onChange={(e) => setYearsOfExperience(e.target.value)}
                        className="mt-1 w-full"
                        placeholder="Enter years of experience"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      About You
                    </label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1 w-full"
                      rows={4}
                      placeholder="Tell us about yourself, your interests, and your goals..."
                    />
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isSaving ? 'Saving...' : 'Save Profile'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded">
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-lg">{userData?.name || userData?.email || 'Not specified'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-lg">{userData?.email || 'Not specified'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <label className="block text-sm font-medium text-gray-700">Gender</label>
                      <p className="mt-1 text-lg">{userData?.gender || 'Not specified'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <label className="block text-sm font-medium text-gray-700">Age</label>
                      <p className="mt-1 text-lg">{userData?.age || 'Not specified'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <label className="block text-sm font-medium text-gray-700">Education Level</label>
                      <p className="mt-1 text-lg">
                        {userData?.educationLevel?.replace('_', ' ').toLowerCase()
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ') || 'Not specified'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <label className="block text-sm font-medium text-gray-700">Major</label>
                      <p className="mt-1 text-lg">{userData?.major || 'Not specified'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <label className="block text-sm font-medium text-gray-700">Job Title</label>
                      <p className="mt-1 text-lg">{userData?.jobTitle || 'Not specified'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                      <p className="mt-1 text-lg">{userData?.yearsOfExperience || 'Not specified'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">About You</label>
                      <p className="mt-1 text-lg">{userData?.description || 'Not specified'}</p>
                    </div>
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
        </div>
      </main>
    </div>
  );
}