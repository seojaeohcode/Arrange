declare class Readability {
    constructor(doc: Document, options?: {
        charThreshold?: number;
        classesToPreserve?: string[];
        keepClasses?: boolean;
        serializer?: (node: Node) => string;
    });
    
    parse(): {
        title: string;
        content: string;
        textContent: string;
        length: number;
        excerpt: string;
        byline: string;
    } | null;
} 