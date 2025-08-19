export interface District {
  id: string;
  name: string;
  created_at: string;
}

export interface Church {
  id: string;
  name: string;
  district_id: string;
  created_at: string;
  district?: District;
}

export interface Registration {
  checkin_token: any;
  id: string;
  full_name: string;
  birth_date: string;
  age: number;
  district_id: string;
  church_id: string;
  payment_status: 'pending' | 'paid';
  payment_method?: 'pix' | 'dinheiro';
  registration_date: string;
  created_at: string;
  updated_at: string;
  district?: District;
  church?: Church;
}