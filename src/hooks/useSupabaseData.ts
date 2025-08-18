import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface District {
  id: string;
  name: string;
}

interface Church {
  id: string;
  name: string;
  district_id: string;
}

interface Registration {
  id: string;
  full_name: string;
  birth_date: string;
  age: number;
  district_id: string;
  church_id: string;
  created_at: string;
  districts: { name: string };
  churches: { name: string };
}

export function useDistricts() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDistricts = async () => {
    try {
      const { data, error } = await supabase
        .from('districts')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setDistricts(data || []);
    } catch (error) {
      console.error('Error fetching districts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistricts();
  }, []);

  const mutate = async () => {
    setLoading(true);
    await fetchDistricts();
  };

  return { districts, loading, mutate };
}

export function useChurches() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChurches = async () => {
    try {
      const { data, error } = await supabase
        .from('churches')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setChurches(data || []);
    } catch (error) {
      console.error('Error fetching churches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChurches();
  }, []);

  const mutate = async () => {
    setLoading(true);
    await fetchChurches();
  };

  return { churches, loading, mutate };
}

export function useRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select(`
          *,
          districts (name),
          churches (name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const mutate = async () => {
    setLoading(true);
    await fetchRegistrations();
  };

  return { registrations, loading, mutate };
}