export interface ApiHealth {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  method?: string;
  path?: string;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
}