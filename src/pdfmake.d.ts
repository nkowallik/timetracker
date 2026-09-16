// pdfmake 0.3 ships no type definitions
declare module 'pdfmake' {
	const pdfmake: {
		addFonts(fonts: unknown): void;
		createPdf(docDefinition: Record<string, unknown>): { getBuffer(): Promise<Uint8Array> };
	};
	export default pdfmake;
}

declare module 'pdfmake/fonts/Roboto.js' {
	const fonts: Record<string, unknown>;
	export default fonts;
}
