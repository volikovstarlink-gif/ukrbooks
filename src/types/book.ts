export type Genre = 'fairy_tale' | 'fable' | 'poetry' | 'classic' | 'legal' | 'historical';
export type Priority = 'P0' | 'P1' | 'P2';
export type Audience = 'kids' | 'students' | 'general';

export interface BookFiles {
  txt?: string;
  fb2?: string;
  epub?: string;
}

export interface Book {
  id: string;
  title: string;
  slug: string;
  author: string;
  genre: Genre;
  priority: Priority;
  audience: Audience;
  language: string;
  description: string;
  year: number | null;
  keywords: string[];
  files: BookFiles;
  cover: string;
  featured: boolean;
}

export interface Category {
  id: string;
  slug: string;
  label: string;
  icon: string;
}
