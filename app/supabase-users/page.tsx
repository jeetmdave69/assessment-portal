'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('*');
      if (error) console.error('Error fetching users:', error);
      else setUsers(data);
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <h1>Users Table</h1>
      <pre>{JSON.stringify(users, null, 2)}</pre>
    </div>
  );
}
