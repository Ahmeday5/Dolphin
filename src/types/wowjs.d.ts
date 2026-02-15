declare module 'wowjs' {
  export class WOW {
    [x: string]: any;
    constructor(options?: any);
    init(): void;
  }
}
