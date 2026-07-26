import type {
  IntelligenceAssistantQuery,
  IntelligenceAssistantResponse,
} from '@kavach/shared-types';

export interface IntelligenceAssistantDesktopApi {
  query(
    request:
      IntelligenceAssistantQuery,
  ): Promise<IntelligenceAssistantResponse>;
}
