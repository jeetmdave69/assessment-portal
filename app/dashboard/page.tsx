"use client";
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import RoleRedirectSplash from "../../components/RoleRedirectSplash";

export default function Dashboard() {
  const { isLoaded, user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const role = user?.publicMetadata?.role;
    if (!role) return router.push("/unauthorized");
    setTimeout(() => {
      if (role === "admin") router.push("/dashboard/admin");
      else if (role === "teacher") router.push("/dashboard/teacher");
      else if (role === "student") router.push("/dashboard/student");
      else router.push("/unauthorized");
    }, 1400); // Show splash for 1.4s
  }, [isLoaded, user, router]);

  return (
    <RoleRedirectSplash
      name={
        typeof user?.firstName === 'string' ? user.firstName :
        typeof user?.fullName === 'string' ? user.fullName :
        typeof user?.username === 'string' ? user.username :
        typeof user?.emailAddresses?.[0]?.emailAddress === 'string' ? user.emailAddresses[0].emailAddress :
        "User"
      }
      role={typeof user?.publicMetadata?.role === 'string' ? user.publicMetadata.role : 'student'}
    />
  );
}
