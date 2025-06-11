'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button, Menu, MenuItem, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';

const roles = ['student', 'teacher', 'admin'];

export default function DevRoleSwitcher() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const clerk = useClerk();

  // fallback to "student" if no role set yet
  const currentRole = (user?.publicMetadata?.role as string) || 'student';

  // Auto-redirect to correct dashboard if path doesn't match role
  useEffect(() => {
    if (!pathname || !pathname.startsWith('/dashboard')) return;

    const parts = pathname.split('/');
    const dashRole = parts[2];

    if (roles.includes(currentRole) && dashRole !== currentRole) {
      router.push(`/dashboard/${currentRole}`);
    }
  }, [pathname, currentRole, router]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

const handleRoleSwitch = async (role: string) => {
  if (!user) return;

  try {
    await user.update({
      public_metadata: { role }, // underscore key is required by Clerk API
    } as any); // cast to any to silence TS

    handleClose();
    router.push(`/dashboard/${role}`);
  } catch (err) {
    console.error('Failed to switch role:', err);
    alert('Failed to switch role. See console for details.');
  }
};


  // Hide in production builds
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <>
      <Tooltip title="Dev Role Switcher">
        <Button
          variant="outlined"
          size="small"
          onClick={handleClick}
          sx={{
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 2,
            px: 1.5,
            py: 0.75,
            textTransform: 'none',
          }}
        >
          Role: {currentRole}
        </Button>
      </Tooltip>

      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {roles.map((role) => (
          <MenuItem key={role} onClick={() => handleRoleSwitch(role)}>
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
