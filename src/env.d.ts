/// <reference path="../.astro/types.d.ts" />

declare module 'plantuml-encoder' {
    const encoder: {
        encode: (text: string) => string;
        decode: (text: string) => string;
    };
    export default encoder;
}
