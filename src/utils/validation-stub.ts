// Temporary stub for zod validation - replace with actual zod when dependency is fixed
export const z = {
  string: () => ({
    min: (_val?: any, _msg?: any) => ({ 
      refine: () => ({ optional: () => ({}) }),
      optional: () => ({})
    }),
    email: () => ({ optional: () => ({}) }),
    optional: () => ({})
  }),
  object: (_schema?: any) => ({
    shape: () => ({}),
    optional: () => ({})
  }),
  number: () => ({
    min: (_val?: any) => ({ optional: () => ({}) }),
    optional: () => ({})
  }),
  boolean: () => ({
    optional: () => ({})
  }),
  enum: (_values?: any[]) => ({
    optional: () => ({})
  })
};

// Export namespace for type compatibility
export namespace z {
  export type ZodType<_T = any> = any;
  export type infer<_T> = any;
}

export type ZodSchema = any;