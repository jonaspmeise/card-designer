declare module 'cardcreator-library' {
  export interface CardCreatorLibraryConfig {}

  export class CardCreatorLibrary {
    constructor(
      deps: any,
      config?: Partial<CardCreatorLibraryConfig>,
    );
    public readonly project: any;
    public readonly events: any;
  }

  export const NO_OP_LOGGER: any;
}
