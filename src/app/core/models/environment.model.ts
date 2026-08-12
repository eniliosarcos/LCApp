export interface ContactConfig {
  whatsapp: string;
  whatsappDisplay: string;
  instagram: string;
  telegram: string;
}

export interface Environment {
  production: boolean;
  apiUrl: string;
  contact: ContactConfig;
}
