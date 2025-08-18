import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useSupabaseData(table: string, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Check if we have an active session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error: supabaseError } = await supabase
        .from(table)
        .select('*');

      if (supabaseError) {
        throw supabaseError;
      }

      setData(data || []);
    } catch (err: any) {
      setError(err);
      toast({
        title: 'Error fetching data',
        description: err.message || 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const mutate = () => fetchData();

  return { data, loading, error, mutate };
}

export function useDistricts() {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchDistricts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching districts...');
      
      const { data, error: supabaseError } = await supabase
        .from('districts')
        .select('*')
        .order('name');

      if (supabaseError) {
        console.error('Supabase error fetching districts:', supabaseError);
        throw supabaseError;
      }

      console.log('Districts fetched successfully:', data);
      setDistricts(data || []);
    } catch (err: any) {
      console.error('Error fetching districts:', err);
      setError(err);
      
      // Show toast only if it's a network or configuration error
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        toast({
          title: 'Erro de conexão',
          description: 'Verifique sua conexão com a internet e tente novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistricts();
  }, []);

  const mutate = () => fetchDistricts();

  return { districts, loading, error, mutate };
}

export function useChurches() {
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchChurches = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching churches...');
      
      const { data, error: supabaseError } = await supabase
        .from('churches')
        .select('*')
        .order('name');

      if (supabaseError) {
        console.error('Supabase error fetching churches:', supabaseError);
        throw supabaseError;
      }

      console.log('Churches fetched successfully:', data);
      setChurches(data || []);
    } catch (err: any) {
      console.error('Error fetching churches:', err);
      setError(err);
      
      // Show toast only if it's a network or configuration error
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        toast({
          title: 'Erro de conexão',
          description: 'Verifique sua conexão com a internet e tente novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChurches();
  }, []);

  const mutate = () => fetchChurches();

  return { churches, loading, error, mutate };
}

export function useRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      
      // Check if we have an active session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error: supabaseError } = await supabase
        .from('registrations')
        .select(`
          *,
          districts (name),
          churches (name)
        `)
        .order('created_at', { ascending: false });
      
      if (supabaseError) {
        throw supabaseError;
      }

      setRegistrations(data || []);
    } catch (err: any) {
      setError(err);
      toast({
        title: 'Error fetching registrations',
        description: err.message || 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const mutate = () => fetchRegistrations();

  return { registrations, loading, error, mutate };
}