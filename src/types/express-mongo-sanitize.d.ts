declare module 'express-mongo-sanitize' {
  import type { RequestHandler } from 'express';

  interface Options {
    replaceWith?: string;
    onSanitize?: (params: { req: unknown; key: string }) => void;
    dryRun?: boolean;
  }

  function mongoSanitize(options?: Options): RequestHandler;
  namespace mongoSanitize {
    function sanitize<T>(value: T, options?: Options): T;
  }

  export = mongoSanitize;
}
