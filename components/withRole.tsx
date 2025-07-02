"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function withRole(Component: any, allowedRoles: string[]) {
  return function RoleProtected(props: any) {
    const { isLoaded, user } = useUser();
    const router = useRouter();

    useEffect(() => {
      if (!isLoaded) return;
      const role = user?.publicMetadata?.role;
      if (!allowedRoles.includes(role as string)) {
        router.push("/unauthorized");
      }
    }, [isLoaded, user, router]);

    return <Component {...props} />;
  };
} 