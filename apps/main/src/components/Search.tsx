import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface SearchResult {
    title: string;
    slug: string;
    course: string;
}

export default function Search({ baseUrl }: { baseUrl: string }) {
    const [lessons, setLessons] = useState<SearchResult[]>([]);
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
                setLessons(data);
            } catch (e) {
                console.error("Failed to load search index", e);
            }
        };
        loadIndex();
    }, [baseUrl]);

    useEffect(() => {
        if (query.trim().length > 1) {
            const filtered = lessons.filter(l => 
                l.title.toLowerCase().includes(query.toLowerCase()) || 
                l.course.toLowerCase().includes(query.toLowerCase())
            );
            setResults(filtered.slice(0, 5));
            setIsOpen(true);
        } else {
            setResults([]);
            setIsOpen(false);
        }
    }, [query, lessons]);

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
        <div className="relative w-full max-w-md" ref={searchRef}>
            <div className="relative">
                <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
                <input 
                    type="text" 
                    placeholder="Quick search..." 
                    className="input-field pl-11 !py-2.5 dark:text-white dark:bg-dark-surface"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length > 1 && setIsOpen(true)}
                />
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-dark-bg !rounded-2xl shadow-2xl z-[100] overflow-hidden transition-all border border-light-border dark:border-dark-border">
                    {results.map((res) => (
                        <a 
                            key={res.slug}
                            href={`${baseUrl}lessons/${res.slug}.html`}
                            className="flex flex-col px-5 py-4 hover:bg-primary/5 transition-all border-b border-light-border dark:border-dark-border last:border-none group"
                        >
                            <span className="font-bold text-light-text dark:text-white group-hover:text-primary transition-colors">{res.title}</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">{res.course}</span>
                        </a>
                    ))}
                </div>
            )}
            
            {isOpen && query.length > 1 && results.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-dark-bg !rounded-2xl shadow-2xl z-[100] p-6 text-center text-light-muted dark:text-dark-muted text-sm italic font-medium border border-light-border dark:border-dark-border">
                    No matching modules found.
                </div>
            )}
        </div>
    );
}
