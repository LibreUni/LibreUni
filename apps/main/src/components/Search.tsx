import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface SearchResult {
    type: 'course' | 'lesson';
    title: string;
    slug: string;
    course: string;
    module?: string;
    description?: string;
    url: string;
}

export default function Search({ baseUrl, variant = 'compact' }: { baseUrl: string; variant?: 'compact' | 'hero' }) {
    const [items, setItems] = useState<SearchResult[]>([]);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load search index on the client only
        const loadIndex = async () => {
            try {
                const res = await fetch(`${baseUrl}search-index.json`);
                const data = await res.json();
                setItems(data);
            } catch (e) {
                console.error("Failed to load search index", e);
            }
        };
        loadIndex();
    }, [baseUrl]);

    useEffect(() => {
        if (query.trim().length > 1) {
            const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
            const scored = items
                .map((item) => {
                    const title = item.title.toLowerCase();
                    const course = item.course.toLowerCase();
                    const module = (item.module ?? '').toLowerCase();
                    const description = (item.description ?? '').toLowerCase();
                    const haystack = `${title} ${course} ${module} ${description}`;
                    if (!terms.every((term) => haystack.includes(term))) return null;

                    const score = terms.reduce((total, term) => {
                        if (title.includes(term)) return total + 5;
                        if (course.includes(term)) return total + 3;
                        if (module.includes(term)) return total + 2;
                        return total + 1;
                    }, item.type === 'course' ? 2 : 0);

                    return { item, score };
                })
                .filter((entry): entry is { item: SearchResult; score: number } => Boolean(entry))
                .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));

            setResults(scored.slice(0, variant === 'hero' ? 8 : 6).map(entry => entry.item));
            setIsOpen(true);
        } else {
            setResults([]);
            setIsOpen(false);
        }
    }, [query, items, variant]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={cn("relative w-full", variant === 'hero' ? "max-w-3xl mx-auto" : "max-w-md")} ref={searchRef}>
            <div className="relative">
                <SearchIcon size={variant === 'hero' ? 22 : 16} className={cn("absolute top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted", variant === 'hero' ? "left-6" : "left-4")} />
                <input 
                    type="text" 
                    placeholder="Search courses, modules, and topics" 
                    className={cn(
                        "input-field dark:text-white dark:bg-dark-surface",
                        variant === 'hero' ? "pl-16 pr-6 !py-5 text-base md:text-lg shadow-2xl shadow-blue-500/10 !rounded-2xl" : "pl-11 !py-2.5"
                    )}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length > 1 && setIsOpen(true)}
                />
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-dark-bg !rounded-2xl shadow-2xl z-[100] overflow-hidden transition-all border border-light-border dark:border-dark-border">
                    {results.map((res) => (
                        <a 
                            key={`${res.type}-${res.slug}`}
                            href={`${baseUrl}${res.url}`}
                            className="flex flex-col px-5 py-4 hover:bg-primary/5 transition-all border-b border-light-border dark:border-dark-border last:border-none group"
                        >
                            <span className="flex items-center gap-3">
                                <span className="font-bold text-light-text dark:text-white group-hover:text-primary transition-colors">{res.title}</span>
                                <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-primary">{res.type}</span>
                            </span>
                            <span className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">{res.type === 'course' ? 'Course' : res.course}</span>
                            {variant === 'hero' && res.description && (
                                <span className="mt-2 line-clamp-2 text-sm font-medium text-light-muted dark:text-dark-muted">{res.description}</span>
                            )}
                        </a>
                    ))}
                </div>
            )}
            
            {isOpen && query.length > 1 && results.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-dark-bg !rounded-2xl shadow-2xl z-[100] p-6 text-center text-light-muted dark:text-dark-muted text-sm italic font-medium border border-light-border dark:border-dark-border">
                    No matching courses or topics found.
                </div>
            )}
        </div>
    );
}
