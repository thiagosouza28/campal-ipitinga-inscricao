import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { District, Church, Registration } from "@/types/database";

export function useDistricts() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDistricts() {
      const { data } = await supabase
        .from('districts')
        .select('*')
        .order('name');
      
      if (data) setDistricts(data);
      setLoading(false);
    }

    fetchDistricts();
  }, []);

  return { districts, loading };
}

export function useChurches() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChurches() {
      const { data } = await supabase
        .from('churches')
        .select(`
          *,
          district:districts(*)
        `)
        .order('name');
      
      if (data) setChurches(data);
      setLoading(false);
    }

    fetchChurches();
  }, []);

  return { churches, loading };
}

export function useRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRegistrations() {
      const { data } = await supabase
        .from('registrations')
        .select(`
          *,
          district:districts(*),
          church:churches(*)
        `)
        .order('created_at', { ascending: false });
      
      if (data) setRegistrations(data as Registration[]);
      setLoading(false);
    }

    fetchRegistrations();
  }, []);

  const refetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('registrations')
      .select(`
        *,
        district:districts(*),
        church:churches(*)
      `)
      .order('created_at', { ascending: false });
    
    if (data) setRegistrations(data as Registration[]);
    setLoading(false);
  };

  return { registrations, loading, refetch };
}