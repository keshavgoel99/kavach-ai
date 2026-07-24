import type {
  EntityProfileDetail,
} from '@kavach/shared-types';

export interface EntityDesktopApi {
  getById(
    entityId: number,
  ): Promise<EntityProfileDetail>;
}
