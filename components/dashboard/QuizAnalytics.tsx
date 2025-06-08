import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const QuizAnalytics = () => {
  const [attempts, setAttempts] = useState<any>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const { data, error } = await supabase.from('attempts').select('*');
        if (error) {
          console.error('Error fetching attempts:', error.message);
          throw error; // Throw the error to be caught below
        }
        setAttempts(data);
      } catch (err: any) {
        console.error('❌ Error fetching attempts:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Quiz Attempts</h3>
      {/* Render attempts data here */}
      <pre>{JSON.stringify(attempts, null, 2)}</pre>
    </div>
  );
};

export default QuizAnalytics;
