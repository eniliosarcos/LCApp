export interface ContactConfig {
  whatsapp: string;
  whatsappDisplay: string;
  instagram: string;
  telegram: string;
}

export interface Environment {
  production: boolean;
  contact: ContactConfig;
}
