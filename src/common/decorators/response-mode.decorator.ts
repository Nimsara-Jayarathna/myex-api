import { SetMetadata } from '@nestjs/common';

export type ResponseMode = 'legacy' | 'standard' | 'admin' | 'passthrough';

export const RESPONSE_MODE_METADATA = 'response_mode';

export const ResponseMode = (mode: ResponseMode) => SetMetadata(RESPONSE_MODE_METADATA, mode);
